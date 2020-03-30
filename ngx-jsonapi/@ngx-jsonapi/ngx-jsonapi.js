import { Injectable, NgModule, isDevMode, ɵsetClassMetadata, ɵɵdefineInjectable, ɵɵdefineInjector, ɵɵdefineNgModule, ɵɵsetNgModuleScope } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpHeaders } from '@angular/common/http';
import { isArray, isObject } from 'util';
import { BehaviorSubject, Subject, noop, of, throwError } from 'rxjs';
import Dexie from 'dexie';
import { catchError, map, share, tap } from 'rxjs/operators';
import { cloneDeep, isEqual } from 'lodash';

class Page {
    constructor() {
        this.number = 1;
        this.total_resources = 0;
        this.size = 0;
        this.resources_per_page = 0; // @deprecated (v2.0.0)
    }
}

class CacheableHelper {
    static propagateLoaded(relationships, value) {
        for (let relationship_alias in relationships) {
            let relationship = relationships[relationship_alias];
            if (relationship instanceof DocumentCollection) {
                // we need to add builded, becuase we dont save objects with content='ids'.
                // these relationships are broken (without any data on data)
                relationship.setLoaded(value && relationship.builded);
            }
        }
    }
}

// @note: had to put type-check methods in a different file because the compiler fails otherwise
function implementsIParamsResource(params) {
    return (params.id !== undefined ||
        params.include_get !== undefined ||
        params.include_save !== undefined);
}

class PathBuilder {
    constructor() {
        this.paths = [];
        this.includes = [];
        this.get_params = [];
    }
    applyParams(service, params = {}) {
        this.appendPath(service.getPrePath());
        if (params.beforepath) {
            this.appendPath(params.beforepath);
        }
        this.appendPath(service.getPath());
        if (params.include) {
            this.setInclude(params.include);
        }
        if (implementsIParamsResource(params) && params.include_get) {
            this.setInclude([...this.includes, ...params.include_get]);
        }
        if (params.fields && Object.keys(params.fields).length > 0) {
            for (let resource_type in params.fields) {
                let fields_param = `fields[${resource_type}]=${params.fields[resource_type].join(',')}`;
                this.get_params.push(fields_param);
            }
        }
    }
    appendPath(value) {
        if (value !== '') {
            this.paths.push(value);
        }
    }
    getForCache() {
        return this.paths.join('/') + this.get_params.join('/');
    }
    get() {
        let params = [...this.get_params];
        if (this.includes.length > 0) {
            params.push('include=' + this.includes.join(','));
        }
        return this.paths.join('/') + (params.length > 0 ? Core.injectedServices.rsJsonapiConfig.params_separator + params.join('&') : '');
    }
    setInclude(strings_array) {
        this.includes = strings_array;
    }
}

// import * as angular from 'angular';
class Converter {
    /*
    Convert json arrays (like included) to an indexed Resources array by [type][id]
    */
    static json_array2resources_array_by_type(json_array) {
        let all_resources = {};
        let resources_by_type = {};
        Converter.json_array2resources_array(json_array, all_resources);
        for (const key in all_resources) {
            let resource = all_resources[key];
            if (!(resource.type in resources_by_type)) {
                resources_by_type[resource.type] = {};
            }
            resources_by_type[resource.type][resource.id] = resource;
        }
        return resources_by_type;
    }
    static json2resource(json_resource, instance_relationships) {
        let resource_service = Converter.getService(json_resource.type);
        if (resource_service) {
            return Converter.procreate(json_resource);
        }
        else {
            if (isDevMode()) {
                console.warn('`' + json_resource.type + '`', 'service not found on json2resource().', 'Use @Autoregister() on service and inject it on component.');
            }
            let temp = new Resource();
            temp.id = json_resource.id;
            temp.type = json_resource.type;
            return temp;
        }
    }
    static getService(type) {
        let resource_service = Core.me.getResourceService(type);
        return resource_service;
    }
    static getServiceOrFail(type) {
        let resource_service = Core.me.getResourceServiceOrFail(type);
        return resource_service;
    }
    static buildIncluded(document_from) {
        if ('included' in document_from && document_from.included) {
            return Converter.json_array2resources_array_by_type(document_from.included);
        }
        return {};
    }
    /* return a resource type(resoruce_service) with data(data) */
    static procreate(data) {
        if (!('type' in data && 'id' in data)) {
            console.error('Jsonapi Resource is not correct', data);
        }
        let resource = CacheMemory.getInstance().getOrCreateResource(data.type, data.id);
        resource.fill({ data: data });
        resource.is_new = false;
        return resource;
    }
    /*
    Convert json arrays (like included) to an Resources arrays without [keys]
    */
    static json_array2resources_array(json_array, destination_array = {}) {
        for (let data of json_array) {
            let resource = Converter.json2resource(data, false);
            destination_array[resource.type + '_' + resource.id] = resource;
        }
    }
}

class ResourceRelationshipsConverter {
    constructor(getService, relationships_from, relationships_dest, included_resources) {
        this.getService = getService;
        this.relationships_from = relationships_from;
        this.relationships_dest = relationships_dest;
        this.included_resources = included_resources;
    }
    buildRelationships() {
        // recorro los relationships levanto el service correspondiente
        for (const relation_alias in this.relationships_from) {
            let relation_from_value = this.relationships_from[relation_alias];
            if (this.relationships_dest[relation_alias] && relation_from_value.data === null) {
                // TODO: FE-92 --- check and improve conditions when building has-one relationships
                this.relationships_dest[relation_alias].data = null;
                this.relationships_dest[relation_alias].builded = true;
                // tslint:disable-next-line:deprecation
                this.relationships_dest[relation_alias].is_loading = false;
                this.relationships_dest[relation_alias].loaded = true;
            }
            if (!relation_from_value.data) {
                continue;
            }
            if (this.relationships_dest[relation_alias] instanceof DocumentCollection) {
                this.__buildRelationshipHasMany(relation_from_value, relation_alias);
            }
            else if (this.relationships_dest[relation_alias] instanceof DocumentResource) {
                this.__buildRelationshipHasOne(relation_from_value, relation_alias);
                // } else if (isDevMode()) {
                //    console.warn(`Relation ${relation_alias} received, but doesn't exist on schema.`);
            }
        }
    }
    __buildRelationshipHasMany(relation_from_value, relation_alias) {
        if (relation_from_value.data.length === 0) {
            this.relationships_dest[relation_alias] = new DocumentCollection();
            this.relationships_dest[relation_alias].builded = true;
            return;
        }
        this.relationships_dest[relation_alias].fill(relation_from_value);
    }
    __buildRelationshipHasOne(relation_data_from, relation_alias) {
        // new related resource <> cached related resource <> ? delete!
        if (!('type' in relation_data_from.data)) {
            this.relationships_dest[relation_alias].data = [];
            return;
        }
        // TODO: FE-92 --- this.is a hotfix... check and improve conditions when building has-one relationships
        if (!this.relationships_dest[relation_alias].data) {
            this.relationships_dest[relation_alias].data = new Resource();
        }
        if (relation_data_from.data.id !== this.relationships_dest[relation_alias].data.id) {
            this.relationships_dest[relation_alias].data = new Resource();
            // with this, fromServer dont fill relationship
            // (<Resource>this.relationships_dest[relation_alias].data).id = relation_data_from.data.id;
            this.relationships_dest[relation_alias].data.type = relation_data_from.data.type;
        }
        if (this.relationships_dest[relation_alias].data.id !== relation_data_from.data.id ||
            !this.relationships_dest[relation_alias].data.attributes ||
            Object.keys(this.relationships_dest[relation_alias].data.attributes).length === 0) {
            let resource_data = this.__buildRelationship(relation_data_from.data);
            if (resource_data) {
                this.relationships_dest[relation_alias].data = resource_data;
                this.relationships_dest[relation_alias].builded = true;
            }
            else {
                // NOTE: HOTFIX para cachestore, no es el lugar correcto pero no había otra forma... me parece que hay que refactorizar...
                this.relationships_dest[relation_alias].data.id = relation_data_from.data.id;
                this.relationships_dest[relation_alias].data.type = relation_data_from.data.type;
            }
        }
    }
    __buildRelationship(resource_data_from) {
        if (resource_data_from.type in this.included_resources &&
            resource_data_from.id in this.included_resources[resource_data_from.type]) {
            // it's in included
            let data = this.included_resources[resource_data_from.type][resource_data_from.id];
            // Store the include in cache
            CacheMemory.getInstance().setResource(data, true);
            // this.getService(resource_data_from.type).cachestore.setResource(data);
            return data;
        }
        else {
            // OPTIONAL: return cached Resource
            let service = this.getService(resource_data_from.type);
            let resource = CacheMemory.getInstance().getResource(resource_data_from.type, resource_data_from.id);
            if (resource) {
                return resource;
            }
        }
    }
}

class Resource {
    constructor() {
        this.id = '';
        this.type = '';
        this.attributes = {};
        this.relationships = {};
        this.links = {};
        this.is_new = true;
        this.is_saving = false;
        this.is_loading = false;
        this.loaded = true;
        this.source = 'new';
        this.cache_last_update = 0;
        this.ttl = 0;
    }
    reset() {
        this.id = '';
        this.attributes = {};
        this.is_new = true;
        for (const key in this.relationships) {
            this.relationships[key] =
                this.relationships[key] instanceof DocumentCollection ? new DocumentCollection() : new DocumentResource();
        }
    }
    toObject(params) {
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        let relationships = {};
        let included = [];
        let included_ids = []; // just for control don't repeat any resource
        let included_relationships = params.include || [];
        if (params.include_save) {
            included_relationships = included_relationships.concat(params.include_save);
        }
        // REALTIONSHIPS
        for (const relation_alias in this.relationships) {
            let relationship = this.relationships[relation_alias];
            if (relationship instanceof DocumentCollection) {
                // @TODO PABLO: definir cuál va a ser la propiedd indispensable para guardar la relación
                if (!relationship.builded && (!relationship.data || relationship.data.length === 0)) {
                    delete relationships[relation_alias];
                }
                else {
                    relationships[relation_alias] = { data: [] };
                }
                for (const resource of relationship.data) {
                    let reational_object = {
                        id: resource.id,
                        type: resource.type
                    };
                    relationships[relation_alias].data.push(reational_object);
                    // no se agregó aún a included && se ha pedido incluir con el parms.include
                    let temporal_id = resource.type + '_' + resource.id;
                    if (included_ids.indexOf(temporal_id) === -1 &&
                        included_relationships &&
                        included_relationships.indexOf(relation_alias) !== -1) {
                        included_ids.push(temporal_id);
                        included.push(resource.toObject({}).data);
                    }
                }
            }
            else {
                // @TODO PABLO: agregué el check de null porque sino fallan las demás condiciones, además es para eliminar la relacxión del back
                if (relationship.data === null || relationship.data === undefined) {
                    relationships[relation_alias] = { data: relationship.data };
                    continue;
                }
                if (!(relationship instanceof DocumentResource)) {
                    console.warn(relationship, ' is not DocumentCollection or DocumentResource');
                }
                let relationship_data = relationship.data;
                if (relationship.data && !('id' in relationship.data) && Object.keys(relationship.data).length > 0) {
                    console.warn(relation_alias + ' defined with hasMany:false, but I have a collection');
                }
                if (relationship_data.id && relationship_data.type) {
                    relationships[relation_alias] = {
                        data: {
                            id: relationship_data.id,
                            type: relationship_data.type
                        }
                    };
                    // @TODO PABLO: definir cuál va a ser la propiedd indispensable para guardar la relación
                    // @WARNING: no borrar la verificación de que no sea null... sino no se van a poder borrar
                }
                else if (!relationship.builded && !relationship_data.id && !relationship_data.type) {
                    delete relationships[relation_alias];
                    continue;
                }
                // no se agregó aún a included && se ha pedido incluir con el parms.include
                let temporal_id = relationship_data.type + '_' + relationship_data.id;
                if (included_ids.indexOf(temporal_id) === -1 &&
                    included_relationships &&
                    included_relationships.indexOf(relation_alias) !== -1) {
                    included_ids.push(temporal_id);
                    included.push(relationship_data.toObject({}).data);
                }
            }
        }
        // just for performance dont copy if not necessary
        let attributes;
        if (this.getService() && this.getService().parseToServer) {
            attributes = Object.assign({}, this.attributes);
            this.getService().parseToServer(attributes);
        }
        else {
            attributes = this.attributes;
        }
        let ret = {
            data: {
                type: this.type,
                id: this.id,
                attributes: attributes,
                relationships: relationships
            }
        };
        // resource's meta
        if (this.meta) {
            ret.data.meta = this.meta;
        }
        // top level meta
        if (params.meta) {
            ret.meta = params.meta;
        }
        if (included.length > 0) {
            ret.included = included;
        }
        return ret;
    }
    fill(data_object) {
        this.id = data_object.data.id || '';
        // WARNING: leaving previous line for a tiem because this can produce undesired behavior
        // this.attributes = data_object.data.attributes || this.attributes;
        this.attributes = Object.assign(Object.assign({}, (this.attributes || {})), data_object.data.attributes);
        this.data_resource = data_object;
        this.is_new = false;
        // NOTE: fix if stored resource has no relationships property
        let service = Converter.getService(data_object.data.type);
        if (!this.relationships && service) {
            this.relationships = new service.resource().relationships;
        }
        // wee need a registered service
        if (!service) {
            return false;
        }
        // only ids?
        if (Object.keys(this.attributes).length) {
            // @todo remove this when getResourceService ToDo is fixed
            let srvc = Converter.getService(this.type);
            if (srvc && 'parseFromServer' in srvc) {
                srvc.parseFromServer(this.attributes);
            }
        }
        if ('cache_last_update' in data_object.data) {
            this.cache_last_update = data_object.data.cache_last_update;
        }
        new ResourceRelationshipsConverter(Converter.getService, data_object.data.relationships || {}, this.relationships, Converter.buildIncluded(data_object)).buildRelationships();
        return true;
    }
    addRelationship(resource, type_alias) {
        let relation = this.relationships[type_alias || resource.type];
        if (relation instanceof DocumentCollection) {
            relation.replaceOrAdd(resource);
        }
        else {
            relation.data = resource;
        }
    }
    addRelationships(resources, type_alias) {
        if (resources.length === 0) {
            return;
        }
        let relation = this.relationships[type_alias];
        if (!(relation instanceof DocumentCollection)) {
            throw new Error('addRelationships require a DocumentCollection (hasMany) relation.');
        }
        resources.forEach((resource) => {
            this.addRelationship(resource, type_alias);
        });
    }
    removeRelationship(type_alias, id) {
        if (!(type_alias in this.relationships)) {
            return false;
        }
        if (!('data' in this.relationships[type_alias])) {
            return false;
        }
        let relation = this.relationships[type_alias];
        if (relation instanceof DocumentCollection) {
            relation.data = relation.data.filter(resource => resource.id !== id);
            if (relation.data.length === 0) {
                // used by toObject() when hasMany is empty
                relation.builded = true;
            }
        }
        else {
            relation.data = null;
        }
        return true;
    }
    hasManyRelated(resource) {
        return this.relationships[resource] && this.relationships[resource].data.length > 0;
    }
    hasOneRelated(resource) {
        return Boolean(this.relationships[resource] &&
            this.relationships[resource].data.type &&
            this.relationships[resource].data.type !== '');
    }
    restore(params = {}) {
        params.meta = Object.assign(Object.assign({}, params.meta), { restore: true });
        return this.save(params);
    }
    /*
    @return This resource like a service
    */
    getService() {
        return Converter.getServiceOrFail(this.type);
    }
    delete() {
        return this.getService().delete(this.id);
    }
    save(params) {
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        if (this.is_saving || !this.loaded) {
            return of({});
        }
        this.is_saving = true;
        let subject = new Subject();
        let object = this.toObject(params);
        if (this.id === '') {
            delete object.data.id;
        }
        // http request
        let path = new PathBuilder();
        path.applyParams(this.getService(), params);
        if (this.id) {
            path.appendPath(this.id);
        }
        Core.exec(path.get(), this.is_new ? 'POST' : 'PATCH', object, true).subscribe(success => {
            this.is_saving = false;
            // force reload collections cache (example: we add a new element)
            if (!this.id) {
                CacheMemory.getInstance().deprecateCollections(path.get());
                let jsonripper = new JsonRipper();
                jsonripper.deprecateCollection(path.get());
            }
            // is a resource?
            if ('id' in success.data) {
                this.id = success.data.id;
                this.fill(success);
            }
            else if (isArray(success.data)) {
                console.warn('Server return a collection when we save()', success.data);
            }
            subject.next(success);
            subject.complete();
        }, error => {
            this.is_saving = false;
            subject.error('data' in error ? error.data : error);
        });
        return subject.asObservable();
    }
    setLoaded(value) {
        // tslint:disable-next-line:deprecation
        this.is_loading = !value;
        this.loaded = value;
    }
    setLoadedAndPropagate(value) {
        this.setLoaded(value);
        CacheableHelper.propagateLoaded(this.relationships, value);
    }
    /** @todo generate interface */
    setSource(value) {
        this.source = value;
    }
    setSourceAndPropagate(value) {
        this.setSource(value);
        for (let relationship_alias in this.relationships) {
            let relationship = this.relationships[relationship_alias];
            if (relationship instanceof DocumentCollection) {
                relationship.setSource(value);
            }
        }
    }
    setCacheLastUpdate(value = Date.now()) {
        this.cache_last_update = value;
    }
}

class Document {
    constructor() {
        this.builded = false;
        // deprecated since 2.2.0. Use loaded.
        this.is_loading = true;
        this.loaded = false;
        this.source = 'new';
        this.cache_last_update = 0;
        this.meta = {};
    }
}

// used for collections on relationships, for parent document use DocumentCollection
class RelatedDocumentCollection extends Document {
    constructor() {
        super(...arguments);
        this.data = [];
        // public data: Array<Resource | IBasicDataResource> = [];
        this.page = new Page();
        this.ttl = 0;
        this.content = 'ids';
    }
    trackBy(iterated_resource) {
        return iterated_resource.id;
    }
    find(id) {
        if (this.content === 'ids') {
            return null;
        }
        // this is the best way: https://jsperf.com/fast-array-foreach
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].id === id) {
                return this.data[i];
            }
        }
        return null;
    }
    fill(data_collection) {
        this.data_collection = data_collection;
        Converter.buildIncluded(data_collection);
        // sometimes get Cannot set property 'number' of undefined (page)
        if (this.page && data_collection.meta) {
            this.page.number = data_collection.meta.page || 1;
            this.page.resources_per_page = data_collection.meta.resources_per_page || null; // @deprecated (v2.0.2)
            this.page.size = data_collection.meta.resources_per_page || null;
            this.page.total_resources = data_collection.meta.total_resources || null;
        }
        // convert and add new dataresoures to final collection
        let new_ids = {};
        this.data.length = 0;
        this.builded = data_collection.data && data_collection.data.length === 0;
        for (let dataresource of data_collection.data) {
            try {
                let res = this.getResourceOrFail(dataresource);
                res.fill({ data: dataresource });
                new_ids[dataresource.id] = dataresource.id;
                this.data.push(res);
                if (Object.keys(res.attributes).length > 0) {
                    this.builded = true;
                }
            }
            catch (error) {
                this.content = 'ids';
                this.builded = false;
                this.data.push({ id: dataresource.id, type: dataresource.type });
            }
        }
        // remove old members of collection (bug, for example, when request something like orders/10/details and has new ids)
        // @todo test with relation.data.filter(resource =>  resource.id != id );
        for (let i; i < this.data.length; i++) {
            if (!(this.data[i].id in new_ids)) {
                delete this.data[i];
            }
        }
        this.meta = data_collection.meta || {};
        if ('cache_last_update' in data_collection) {
            this.cache_last_update = data_collection.cache_last_update;
        }
    }
    getResourceOrFail(dataresource) {
        let res = this.find(dataresource.id);
        if (res !== null) {
            return res;
        }
        let service = Converter.getService(dataresource.type);
        // remove when getService return null or catch errors
        // this prvent a fill on undefinied service :/
        if (!service) {
            if (isDevMode()) {
                console.warn('The relationship ' +
                    'relation_alias?' +
                    ' (type ' +
                    dataresource.type +
                    ') cant be generated because service for this type has not been injected.');
            }
            throw new Error('Cant create service for ' + dataresource.type);
        }
        // END remove when getService return null or catch errors
        return service.getOrCreateResource(dataresource.id);
    }
    replaceOrAdd(resource) {
        let res = this.find(resource.id);
        if (res === null) {
            this.data.push(resource);
        }
        else {
            res = resource;
        }
    }
    hasMorePages() {
        if (!this.page.size || this.page.size < 1) {
            return null;
        }
        let total_resources = this.page.size * (this.page.number - 1) + this.data.length;
        return total_resources < this.page.total_resources;
    }
    setLoaded(value) {
        // tslint:disable-next-line:deprecation
        this.is_loading = !value;
        this.loaded = value;
    }
    setLoadedAndPropagate(value) {
        this.setLoaded(value);
        if (this.content === 'ids') {
            return;
        }
        this.data.forEach(resource => {
            CacheableHelper.propagateLoaded(resource.relationships, value);
        });
    }
    setBuilded(value) {
        this.builded = value;
    }
    setBuildedAndPropagate(value) {
        this.setBuilded(value);
        if (this.content === 'ids') {
            return;
        }
        this.data.forEach(resource => {
            resource.setLoaded(value);
        });
    }
    setSource(value) {
        this.source = value;
    }
    setSourceAndPropagate(value) {
        this.setSource(value);
        this.data.forEach(resource => {
            if (resource instanceof Resource) {
                resource.setSource(value);
            }
        });
    }
    setCacheLastUpdate(value = Date.now()) {
        this.cache_last_update = value;
    }
    setCacheLastUpdateAndPropagate(value = Date.now()) {
        this.setCacheLastUpdate(value);
        this.data.forEach(resource => {
            if (resource instanceof Resource) {
                resource.setCacheLastUpdate(value);
            }
        });
    }
    toObject(params) {
        if (!this.builded) {
            return { data: this.data };
        }
        let data = this.data.map(resource => {
            return resource.toObject(params).data;
        });
        return {
            data: data
        };
    }
}
class DocumentCollection extends RelatedDocumentCollection {
    constructor() {
        super(...arguments);
        this.data = [];
        this.content = 'collection';
    }
}

class Base {
    static newCollection() {
        return new DocumentCollection();
    }
    static isObjectLive(ttl, last_update) {
        return ttl >= 0 && Date.now() <= last_update + ttl * 1000;
    }
    static forEach(collection, fc) {
        Object.keys(collection).forEach(key => {
            fc(collection[key], key);
        });
    }
}
Base.ParamsResource = {
    beforepath: '',
    ttl: undefined,
    include: [],
    fields: {},
    id: ''
};
Base.ParamsCollection = {
    beforepath: '',
    ttl: undefined,
    include: [],
    remotefilter: {},
    fields: {},
    smartfilter: {},
    sort: [],
    page: new Page(),
    store_cache_method: 'individual',
    storage_ttl: 0,
    cachehash: ''
};

class CacheMemory {
    constructor() {
        this.resources = {};
        this.collections = {};
    }
    static getInstance() {
        if (!CacheMemory.instance) {
            CacheMemory.instance = new CacheMemory();
        }
        return CacheMemory.instance;
    }
    clearCache() {
        this.resources = {};
        this.collections = {};
        CacheMemory.instance = null;
    }
    getResource(type, id) {
        if (this.getKey(type, id) in this.resources) {
            return this.resources[this.getKey(type, id)];
        }
        return null;
    }
    getResourceOrFail(type, id) {
        if (this.getKey(type, id) in this.resources) {
            return this.resources[this.getKey(type, id)];
        }
        throw new Error('The requested resource does not exist in cache memory');
    }
    getKey(type, id) {
        return type + '.' + id;
    }
    getOrCreateCollection(url) {
        if (!(url in this.collections)) {
            this.collections[url] = new DocumentCollection();
            this.collections[url].source = 'new';
        }
        return this.collections[url];
    }
    setCollection(url, collection) {
        // v1: clone collection, because after maybe delete items for localfilter o pagination
        if (!(url in this.collections)) {
            this.collections[url] = new DocumentCollection();
        }
        for (let i = 0; i < collection.data.length; i++) {
            let resource = collection.data[i];
            // this.collections[url].data.push(resource);
            this.setResource(resource, true);
        }
        this.collections[url].data = collection.data;
        this.collections[url].page = collection.page;
        this.collections[url].cache_last_update = collection.cache_last_update;
    }
    getOrCreateResource(type, id) {
        let resource = this.getResource(type, id);
        if (resource !== null) {
            return resource;
        }
        resource = Converter.getServiceOrFail(type).new();
        resource.id = id;
        // needed for a lot of request (all and get, tested on multinexo.com)
        this.setResource(resource, false);
        return resource;
    }
    setResource(resource, update_lastupdate = false) {
        if (this.getKey(resource.type, resource.id) in this.resources) {
            this.fillExistentResource(resource);
        }
        else {
            this.resources[this.getKey(resource.type, resource.id)] = resource;
        }
        this.resources[this.getKey(resource.type, resource.id)].cache_last_update = update_lastupdate ? Date.now() : 0;
    }
    deprecateCollections(path_includes = '') {
        for (let collection_key in this.collections) {
            if (collection_key.includes(path_includes)) {
                this.collections[collection_key].cache_last_update = 0;
            }
        }
        return true;
    }
    removeResource(type, id) {
        let resource = this.getResource(type, id);
        if (!resource) {
            return;
        }
        Base.forEach(this.collections, (value, url) => {
            value.data.splice(value.data.findIndex((resource_on_collection) => resource_on_collection.type === type && resource_on_collection.id === id), 1);
        });
        resource.attributes = {}; // just for confirm deletion on view
        // this.resources[id].relationships = {}; // just for confirm deletion on view
        for (let relationship in resource.relationships) {
            if (resource.relationships[relationship].data === null || resource.relationships[relationship].data === undefined) {
                continue;
            }
            if (resource.relationships[relationship].data instanceof Array) {
                resource.relationships[relationship].data = []; // just in case that there is a for loop using it
            }
            else if (resource.relationships[relationship].data instanceof Object) {
                delete resource.relationships[relationship].data;
            }
        }
        delete this.resources[this.getKey(type, id)];
    }
    fillExistentResource(source) {
        let destination = this.getResourceOrFail(source.type, source.id);
        destination.attributes = Object.assign(Object.assign({}, destination.attributes), source.attributes);
        destination.relationships = destination.relationships || source.relationships;
        // remove relationships on destination resource
        // for (let type_alias in destination.relationships) {
        //     // problem with no declared services
        //     if (destination.relationships[type_alias].data === undefined) {
        //         continue;
        //     }
        //     if (!(type_alias in source.relationships)) {
        //         delete destination.relationships[type_alias];
        //     } else {
        //         // relation is a collection
        //         let collection = <DocumentCollection>destination.relationships[type_alias];
        //         // TODO: talkto Pablo, this could be and Object... (following IF statement added by Maxi)
        //         if (!Array.isArray(collection.data)) {
        //             continue;
        //         }
        //         for (let resource of collection.data) {
        //             if (collection.find(resource.id) === null) {
        //                 delete destination.relationships[type_alias];
        //             }
        //         }
        //     }
        // }
        // // add source relationships to destination
        // for (let type_alias in source.relationships) {
        //     // problem with no declared services
        //     if (source.relationships[type_alias].data === undefined) {
        //         continue;
        //     }
        //     if (source.relationships[type_alias].data === null) {
        //         // TODO: FE-92 --- check and improve conditions when building has-one relationships
        //         destination.relationships[type_alias].data = null;
        //         continue;
        //     }
        //     if ('id' in source.relationships[type_alias].data) {
        //         destination.addRelationship(<Resource>source.relationships[type_alias].data, type_alias);
        //     } else {
        //         destination.addRelationships(<Array<Resource>>source.relationships[type_alias].data, type_alias);
        //     }
        // }
    }
}

class DocumentResource extends Document {
    constructor() {
        super(...arguments);
        this.data = new Resource();
        this.builded = false;
        this.content = 'id';
    }
    fill(data_resource) {
        this.builded = false;
        this.content = 'id';
        this.data_resource = data_resource;
        if (data_resource === null) {
            this.data = null;
            return;
        }
        if (!this.data) {
            this.data = CacheMemory.getInstance().getOrCreateResource(data_resource.data.type, data_resource.data.id);
        }
        if (this.data.fill(data_resource)) {
            this.builded = true;
            this.content = 'resource';
        }
        this.meta = data_resource.meta || {};
    }
    unsetData() {
        this.data = undefined;
        this.builded = false;
    }
}

var __awaiter$2 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class DexieDataProvider {
    constructor() {
        if (DexieDataProvider.db) {
            return;
        }
        DexieDataProvider.db = new Dexie('dexie_data_provider');
        DexieDataProvider.db.version(1).stores({
            collections: '',
            elements: ''
        });
    }
    getElement(key, table_name = 'elements') {
        return __awaiter$2(this, void 0, void 0, function* () {
            yield DexieDataProvider.db.open();
            const data = yield DexieDataProvider.db.table(table_name).get(key);
            if (data === undefined) {
                throw new Error(key + ' not found.');
            }
            return data;
        });
    }
    getElements(keys, table_name = 'elements') {
        return __awaiter$2(this, void 0, void 0, function* () {
            let data = {};
            yield DexieDataProvider.db
                .table(table_name)
                .where(':id')
                .anyOf(keys)
                .each(element => {
                data[element.data.type + '.' + element.data.id] = element;
            });
            // we need to maintain same order, database return ordered by key
            return keys.map(key => {
                return data[key];
            });
        });
    }
    // @todo implement dexie.modify(changes)
    // @todo test
    updateElements(key_start_with, changes, table_name = 'elements') {
        return __awaiter$2(this, void 0, void 0, function* () {
            return DexieDataProvider.db.open().then(() => __awaiter$2(this, void 0, void 0, function* () {
                if (key_start_with === '') {
                    return DexieDataProvider.db.table(table_name).clear();
                }
                else {
                    return DexieDataProvider.db
                        .table(table_name)
                        .where(':id')
                        .startsWith(key_start_with)
                        .delete()
                        .then(() => undefined);
                }
            }));
        });
    }
    saveElements(elements, table_name = 'elements') {
        return __awaiter$2(this, void 0, void 0, function* () {
            let keys = [];
            let items = elements.map(element => {
                keys.push(element.key);
                return element.content;
            });
            return DexieDataProvider.db.open().then(() => {
                DexieDataProvider.db.table(table_name).bulkPut(items, keys);
            });
        });
    }
}

var __awaiter$1 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class JsonRipper {
    constructor() {
        this.dataProvider = new DexieDataProvider();
    }
    getResource(key, include = []) {
        return __awaiter$1(this, void 0, void 0, function* () {
            let stored_resource = (yield this.getDataResources([key])).shift();
            if (stored_resource === undefined) {
                throw new Error(`Resource ${key} don't found.`);
            }
            if (include.length === 0) {
                return stored_resource;
            }
            let included_keys = [];
            include.forEach(relationship_alias => {
                // @NOTE: typescript doesn't detect throwError added a few lines above when stored_resource === undefnied
                if (!stored_resource || !stored_resource.data.relationships || !stored_resource.data.relationships[relationship_alias]) {
                    // this is a classic problem when relationship property is missing on included resources
                    throw new Error('We dont have relation_alias on stored data resource');
                }
                const relationship = stored_resource.data.relationships[relationship_alias].data;
                if (relationship instanceof Array) {
                    relationship.forEach(related_resource => {
                        included_keys.push(JsonRipper.getResourceKey(related_resource));
                    });
                }
                else if (relationship && 'id' in relationship) {
                    included_keys.push(JsonRipper.getResourceKey(relationship));
                }
            });
            let included_resources = yield this.getDataResources(included_keys);
            return Object.assign(Object.assign({}, stored_resource), { included: included_resources.map(document_resource => document_resource.data) });
        });
    }
    getCollection(url, include = []) {
        return __awaiter$1(this, void 0, void 0, function* () {
            let stored_collection = yield this.getDataCollection(url);
            let data_resources = yield this.getDataResources(stored_collection.keys);
            let ret = {
                data: data_resources.map(data_resource => data_resource.data),
                cache_last_update: stored_collection.updated_at
            };
            if (include.length === 0) {
                return ret;
            }
            let included_keys = [];
            include.forEach(relationship_alias => {
                data_resources.forEach(resource => {
                    if (!resource.data.relationships || !resource.data.relationships[relationship_alias]) {
                        return;
                    }
                    const relationship = resource.data.relationships[relationship_alias].data;
                    if (relationship instanceof Array) {
                        relationship.forEach(related_resource => {
                            included_keys.push(JsonRipper.getResourceKey(related_resource));
                        });
                    }
                    else if ('id' in relationship) {
                        included_keys.push(JsonRipper.getResourceKey(relationship));
                    }
                });
            });
            let included_resources = yield this.getDataResources(included_keys);
            return Object.assign(Object.assign({}, ret), { included: included_resources.map(document_resource => document_resource.data) });
        });
    }
    getDataCollection(url) {
        return __awaiter$1(this, void 0, void 0, function* () {
            return this.dataProvider.getElement(url, 'collections');
        });
    }
    getDataResources(keys) {
        return __awaiter$1(this, void 0, void 0, function* () {
            return this.dataProvider.getElements(keys, 'elements');
        });
    }
    saveCollection(url, collection, include = []) {
        this.dataProvider.saveElements(JsonRipper.collectionToElement(url, collection), 'collections');
        this.dataProvider.saveElements(JsonRipper.collectionResourcesToElements(collection, include), 'elements');
    }
    saveResource(resource, include = []) {
        return __awaiter$1(this, void 0, void 0, function* () {
            return this.dataProvider.saveElements(JsonRipper.toResourceElements(JsonRipper.getResourceKey(resource), resource, include), 'elements');
        });
    }
    static collectionToElement(url, collection) {
        let collection_element = {
            key: url,
            content: { updated_at: Date.now(), keys: [] }
        };
        collection.data.forEach(resource => {
            let key = JsonRipper.getResourceKey(resource);
            collection_element.content.keys.push(key);
        });
        return [collection_element];
    }
    static collectionResourcesToElements(collection, include = []) {
        let elements = [];
        collection.data.forEach(resource => {
            let key = JsonRipper.getResourceKey(resource);
            elements.push(...JsonRipper.toResourceElements(key, resource, include));
        });
        return elements;
    }
    static toResourceElements(key, resource, include = []) {
        let elements = [
            {
                key: key,
                content: resource.toObject()
            }
        ];
        elements[0].content.data.cache_last_update = Date.now();
        include.forEach(relationship_alias => {
            const relationship = resource.relationships[relationship_alias];
            if (relationship instanceof DocumentCollection) {
                relationship.data.forEach(related_resource => {
                    elements.push(JsonRipper.getElement(related_resource));
                });
            }
            else if (relationship instanceof DocumentResource) {
                if (relationship.data === null || relationship.data === undefined) {
                    return;
                }
                elements.push(JsonRipper.getElement(relationship.data));
            }
        });
        return elements;
    }
    static getResourceKey(resource) {
        return resource.type + '.' + resource.id;
    }
    static getElement(resource) {
        return {
            key: JsonRipper.getResourceKey(resource),
            content: resource.toObject()
        };
    }
    deprecateCollection(key_start_with) {
        return __awaiter$1(this, void 0, void 0, function* () {
            return this.dataProvider.updateElements(key_start_with, {}, 'collections');
        });
    }
}

function isLive(cacheable, ttl) {
    let ttl_in_seconds = ttl && typeof ttl === 'number' ? ttl : cacheable.ttl || 0;
    return Date.now() < cacheable.cache_last_update + ttl_in_seconds * 1000;
}
// @todo test required for hasMany and hasOne
function relationshipsAreBuilded(resource, includes) {
    if (includes.length === 0) {
        return true;
    }
    for (let relationship_alias in resource.relationships) {
        if (includes.includes(relationship_alias) && !resource.relationships[relationship_alias].builded) {
            return false;
        }
    }
    return true;
}
/**
 * @deprecated since 2.2.0
 */

/**
 * @deprecated since 2.2.0
 */

// NOTE: Checks that the service passed to the method is registered (method needs to have service's type or a resource as first arg)
// changes "PropertyDescriptor | null" type for "any" to avoid typescript error in decorators property decorators
// (see https://stackoverflow.com/questions/37694322/typescript-ts1241-unable-to-resolve-signature-of-method-decorator-when-called-a)
function serviceIsRegistered(target, key, descriptor) {
    const original = descriptor.value;
    descriptor.value = function () {
        let args = Array.prototype.slice.call(arguments);
        let type;
        try {
            if (typeof args[0] === 'string') {
                type = args[0];
            }
            else {
                type = args[0].type;
            }
        }
        catch (err) {
            console.warn(`ERROR: First argument of methods decorated with serviceIsRegistered has to be string or Resource.`);
            return null;
        }
        const service_is_registered = Core.me.getResourceService(type);
        if (!service_is_registered) {
            console.warn(`ERROR: ${type} service has not been registered.`);
            return null;
        }
        const result = original.apply(this, args);
        return result;
    };
    return descriptor;
}

/**
 * Allows for retrieving singletons using `AppInjector.get(MyService)` (whereas
 * `ReflectiveInjector.resolveAndCreate(MyService)` would create a new instance
 * of the service).
 */
let JsonapiInjector;
/**
 * Helper to set the exported {@link AppInjector}, needed as ES6 modules export
 * immutable bindings (see http://2ality.com/2015/07/es6-module-exports.html) for
 * which trying to make changes after using `import {AppInjector}` would throw:
 * "TS2539: Cannot assign to 'AppInjector' because it is not a variable".
 */
function setJsonapiInjector(injector) {
    JsonapiInjector = injector;
    // if (AppInjector) {
    //     // Should not happen
    //     console.error('Programming error: AppInjector was already set');
    // }
    // else {
    // }
}

class JsonapiConfig {
    constructor() {
        this.url = 'http://yourdomain/api/v1/';
        this.params_separator = '?';
        this.unify_concurrency = true;
        this.cache_prerequests = true;
        this.cachestore_support = true;
        this.parameters = {
            page: {
                number: 'page[number]',
                size: 'page[size]'
            }
        };
    }
}
JsonapiConfig.ɵfac = function JsonapiConfig_Factory(t) { return new (t || JsonapiConfig)(); };
JsonapiConfig.ɵprov = ɵɵdefineInjectable({ token: JsonapiConfig, factory: JsonapiConfig.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { ɵsetClassMetadata(JsonapiConfig, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], null, null); })();

class Http {
    constructor() {
        // NOTE: GET requests are stored in a this object to prevent duplicate requests
        this.get_requests = {};
        // this.http = JsonapiInjector.get(HttpClient)
        this.rsJsonapiConfig = JsonapiInjector.get(JsonapiConfig);
    }
    setHttpClient(http$$1) {
        this.http = http$$1;
    }
    exec(path, method, data) {
        let req = {
            body: data || null,
            headers: new HttpHeaders({
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json'
            })
        };
        // NOTE: prevent duplicate GET requests
        if (method === 'get') {
            if (!this.get_requests[path]) {
                let obs = this.http.request(method, this.rsJsonapiConfig.url + path, req).pipe(tap(() => {
                    delete this.get_requests[path];
                }), share());
                this.get_requests[path] = obs;
                return obs;
            }
            return this.get_requests[path];
        }
        return this.http.request(method, this.rsJsonapiConfig.url + path, req).pipe(tap(() => {
            delete this.get_requests[path];
        }), share());
    }
}
Http.ɵfac = function Http_Factory(t) { return new (t || Http)(); };
Http.ɵprov = ɵɵdefineInjectable({ token: Http, factory: Http.ɵfac });
/*@__PURE__*/ (function () { ɵsetClassMetadata(Http, [{
        type: Injectable
    }], function () { return []; }, null); })();

var __awaiter$3 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class StoreService /* implements IStoreService */ {
    constructor() {
        this.db = new Dexie('jsonapi_db');
        this.db.version(1).stores({
            collections: '',
            elements: ''
        });
        this.checkIfIsTimeToClean();
    }
    getDataObject(type, id_or_url) {
        return __awaiter$3(this, void 0, void 0, function* () {
            // we use different tables for resources and collections
            const table_name = type === 'collection' ? 'collections' : 'elements';
            yield this.db.open();
            let item = yield this.db.table(table_name).get(type + '.' + id_or_url);
            if (item === undefined) {
                throw new Error();
            }
            return item;
        });
    }
    getDataResources(keys) {
        return __awaiter$3(this, void 0, void 0, function* () {
            const collection = this.db
                .table('elements')
                .where(':id')
                .anyOf(keys);
            let resources_by_id = {};
            yield collection.each(item => {
                resources_by_id[item.id] = item;
            });
            return resources_by_id;
        });
    }
    saveResource(type, url_or_id, value) {
        let data_resource_storage = Object.assign({ cache_last_update: Date.now() }, value);
        this.db.open().then(() => __awaiter$3(this, void 0, void 0, function* () {
            return this.db.table('elements').put(data_resource_storage, type + '.' + url_or_id);
        }));
    }
    saveCollection(url_or_id, value) {
        let data_collection_storage = Object.assign({ cache_last_update: Date.now() }, value);
        this.db.open().then(() => __awaiter$3(this, void 0, void 0, function* () {
            return this.db.table('collections').put(data_collection_storage, 'collection.' + url_or_id);
        }));
    }
    clearCache() {
        this.db.open().then(() => __awaiter$3(this, void 0, void 0, function* () {
            return this.db
                .table('elements')
                .toCollection()
                .delete();
        }));
        this.db.open().then(() => __awaiter$3(this, void 0, void 0, function* () {
            return this.db
                .table('collections')
                .toCollection()
                .delete();
        }));
    }
    deprecateResource(type, id) {
        this.db.open().then(() => __awaiter$3(this, void 0, void 0, function* () {
            return this.db
                .table('elements')
                .where(':id')
                .startsWith(type + '.' + id)
                .modify({ cache_last_update: 0 });
        }));
    }
    deprecateCollection(key_start_with) {
        this.db.open().then(() => __awaiter$3(this, void 0, void 0, function* () {
            return this.db
                .table('collections')
                .where(':id')
                .startsWith(key_start_with)
                .modify({ cache_last_update: 0 });
        }));
    }
    removeObjectsWithKey(key) {
        return __awaiter$3(this, void 0, void 0, function* () {
            /*
            this.allstore.removeItem(key);
            await this.allstore.getItems().then(async result => {
                for (let saved_resource_key in result) {
                    let resource_id_split = key.split('.');
                    let resource_id = resource_id_split[resource_id_split.length - 1];
                    if (
                        Array.isArray(result[saved_resource_key].data) &&
                        result[saved_resource_key].data.find(resource => resource.id === resource_id)
                    ) {
                        result[saved_resource_key].data.splice(
                            result[saved_resource_key].data.findIndex(resource => resource.id === resource_id),
                            1
                        );
                        await this.allstore.setItem(saved_resource_key, result[saved_resource_key]);
                    }
                }
            });
            */
        });
    }
    checkIfIsTimeToClean() {
        // check if is time to check cachestore
        /*
        this.globalstore
            .getItem('_lastclean_time')
            .then((success: IStoreElement) => {
                if (Date.now() >= success.time + 12 * 3600 * 1000) {
                    // is time to check cachestore!
                    this.globalstore.setItem('_lastclean_time', {
                        time: Date.now()
                    });
                    this.checkAndDeleteOldElements();
                }
            })
            .catch(() => {
                this.globalstore.setItem('_lastclean_time', {
                    time: Date.now()
                });
            });
        */
    }
    checkAndDeleteOldElements() {
        /*
        this.allstore
            .keys()
            .then(success => {
                Base.forEach(success, key => {
                    // recorremos cada item y vemos si es tiempo de removerlo
                    this.allstore
                        .getItem(key)
                        .then((success2: ICacheableDataCollection | ICacheableDataResource) => {
                            if (Date.now() >= success2.cache_last_update + 24 * 3600 * 1000) {
                                this.allstore.removeItem(key);
                            }
                        })
                        .catch(noop);
                });
            })
            .catch(noop);
        */
    }
}
StoreService.ɵfac = function StoreService_Factory(t) { return new (t || StoreService /* implements IStoreService */)(); };
StoreService.ɵprov = ɵɵdefineInjectable({ token: StoreService /* implements IStoreService */, factory: StoreService /* implements IStoreService */.ɵfac });
/*@__PURE__*/ (function () { ɵsetClassMetadata(StoreService /* implements IStoreService */, [{
        type: Injectable
    }], function () { return []; }, null); })();

var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Core {
    constructor() {
        this.loadingsCounter = 0;
        this.loadingsStart = noop;
        this.loadingsDone = noop;
        this.loadingsError = noop;
        this.loadingsOffline = noop;
        this.resourceServices = {};
        this.config = new JsonapiConfig();
        let user_config = JsonapiInjector.get(JsonapiConfig);
        let jsonapiStoreService = JsonapiInjector.get(StoreService);
        let jsonapiHttp = JsonapiInjector.get(Http);
        for (let k in this.config) {
            this.config[k] = user_config[k] !== undefined ? user_config[k] : this.config[k];
        }
        Core.me = this;
        Core.injectedServices = {
            JsonapiStoreService: jsonapiStoreService,
            JsonapiHttp: jsonapiHttp,
            rsJsonapiConfig: this.config
        };
    }
    setHttpClient(http$$1) {
        Core.injectedServices.JsonapiHttp.setHttpClient(http$$1);
    }
    static delete(path) {
        return Core.exec(path, 'DELETE');
    }
    static get(path) {
        return Core.exec(path, 'get');
    }
    static exec(path, method, data, call_loadings_error = true) {
        Core.me.refreshLoadings(1);
        return Core.injectedServices.JsonapiHttp.exec(path, method, data).pipe(
        // map(data => { return data.body }),
        tap(() => Core.me.refreshLoadings(-1)), catchError(error => {
            error = error.error || error;
            Core.me.refreshLoadings(-1);
            if (error.status <= 0) {
                // offline?
                if (!Core.me.loadingsOffline(error) && isDevMode()) {
                    console.warn('Jsonapi.Http.exec (use JsonapiCore.loadingsOffline for catch it) error =>', error);
                }
            }
            else if (call_loadings_error && !Core.me.loadingsError(error) && isDevMode()) {
                console.warn('Jsonapi.Http.exec (use JsonapiCore.loadingsError for catch it) error =>', error);
            }
            return throwError(error);
        }));
    }
    registerService(clase) {
        if (clase.type in this.resourceServices) {
            return false;
        }
        this.resourceServices[clase.type] = clase;
        return clase;
    }
    // @todo this function could return an empty value, fix required
    getResourceService(type) {
        return this.resourceServices[type];
    }
    getResourceServiceOrFail(type) {
        let service = this.resourceServices[type];
        if (!service) {
            throw new Error(`The requested service with type ${type} has not been registered, please use register() method or @Autoregister() decorator`);
        }
        return service;
    }
    static removeCachedResource(resource_type, resource_id) {
        CacheMemory.getInstance().removeResource(resource_type, resource_id);
        
    }
    static setCachedResource(resource) {
        CacheMemory.getInstance().setResource(resource, true);
        
    }
    static deprecateCachedCollections(type) {
        let service = Core.me.getResourceServiceOrFail(type);
        let path = new PathBuilder();
        path.applyParams(service);
        CacheMemory.getInstance().deprecateCollections(path.getForCache());
        
    }
    refreshLoadings(factor) {
        this.loadingsCounter += factor;
        if (this.loadingsCounter === 0) {
            this.loadingsDone();
        }
        else if (this.loadingsCounter === 1) {
            this.loadingsStart();
        }
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            Core.injectedServices.JsonapiStoreService.clearCache();
            CacheMemory.getInstance().clearCache();
            let json_ripper = new JsonRipper();
            return json_ripper.deprecateCollection('').then(() => true);
        });
    }
    // just an helper
    duplicateResource(resource, ...relations_alias_to_duplicate_too) {
        let newresource = this.getResourceServiceOrFail(resource.type).new();
        newresource.id = 'new_' + Math.floor(Math.random() * 10000).toString();
        newresource.attributes = Object.assign(Object.assign({}, newresource.attributes), resource.attributes);
        for (const alias in resource.relationships) {
            let relationship = resource.relationships[alias];
            if (!relationship.data) {
                newresource.relationships[alias] = resource.relationships[alias];
                continue;
            }
            if ('id' in relationship.data) {
                // relation hasOne
                if (relations_alias_to_duplicate_too.indexOf(alias) > -1) {
                    newresource.addRelationship(this.duplicateResource(relationship.data), alias);
                }
                else {
                    newresource.addRelationship(relationship.data, alias);
                }
            }
            else {
                // relation hasMany
                if (relations_alias_to_duplicate_too.indexOf(alias) > -1) {
                    relationship.data.forEach(relationresource => {
                        newresource.addRelationship(this.duplicateResource(relationresource), alias);
                    });
                }
                else {
                    newresource.addRelationships(relationship.data, alias);
                }
            }
        }
        return newresource;
    }
}
Core.ɵfac = function Core_Factory(t) { return new (t || Core)(); };
Core.ɵprov = ɵɵdefineInjectable({ token: Core, factory: Core.ɵfac });
__decorate([
    serviceIsRegistered,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], Core, "removeCachedResource", null);
__decorate([
    serviceIsRegistered,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Resource]),
    __metadata("design:returntype", void 0)
], Core, "setCachedResource", null);
__decorate([
    serviceIsRegistered,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], Core, "deprecateCachedCollections", null);
/*@__PURE__*/ (function () { ɵsetClassMetadata(Core, [{
        type: Injectable
    }], function () { return []; }, null); })();

// import { BrowserModule } from '@angular/platform-browser';
// testing
class NgxJsonapiModule {
    static forRoot(config) {
        return {
            ngModule: NgxJsonapiModule,
            providers: [{ provide: JsonapiConfig, useValue: config }]
        };
    }
}
NgxJsonapiModule.ɵmod = ɵɵdefineNgModule({ type: NgxJsonapiModule });
NgxJsonapiModule.ɵinj = ɵɵdefineInjector({ factory: function NgxJsonapiModule_Factory(t) { return new (t || NgxJsonapiModule)(); }, providers: [
        Core,
        StoreService,
        JsonapiConfig,
        Http
    ], imports: [[CommonModule],
        // BrowserModule,  // needed by HttpClientModule?
        HttpClientModule] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && ɵɵsetNgModuleScope(NgxJsonapiModule, { imports: [CommonModule], exports: [
        // BrowserModule,  // needed by HttpClientModule?
        HttpClientModule] }); })();
/*@__PURE__*/ (function () { ɵsetClassMetadata(NgxJsonapiModule, [{
        type: NgModule,
        args: [{
                imports: [CommonModule],
                exports: [
                    // BrowserModule,  // needed by HttpClientModule?
                    HttpClientModule
                ],
                providers: [
                    Core,
                    StoreService,
                    JsonapiConfig,
                    Http
                ]
            }]
    }], null, null); })();

/**
 * @deprecated since version 3.0.0
 */
function Autoregister() {
    return (target) => {
        /**/
    };
}

class UrlParamsBuilder {
    toparams(params) {
        let ret = '';
        Base.forEach(params, (value, key) => {
            ret += this.toparamsarray(value, '&' + key);
        });
        return ret.slice(1);
    }
    toparamsarray(params, add) {
        let ret = '';
        if (Array.isArray(params)) {
            Base.forEach(params, function (value, key) {
                ret += add + '[]=' + value;
            });
        }
        else if (isObject(params)) {
            Base.forEach(params, (value, key) => {
                ret += this.toparamsarray(value, add + '[' + key + ']');
            });
        }
        else {
            ret += add + '=' + params;
        }
        return ret;
    }
}

class PathCollectionBuilder extends PathBuilder {
    applyParams(service, params = {}) {
        super.applyParams(service, params);
        let paramsurl = new UrlParamsBuilder();
        if (params.remotefilter && Object.keys(params.remotefilter).length > 0) {
            if (service.parseToServer) {
                service.parseToServer(params.remotefilter);
            }
            this.addParam(paramsurl.toparams({ filter: params.remotefilter }));
        }
        if (params.page) {
            if (params.page.number > 1) {
                this.addParam(this.getPageConfig().number + '=' + params.page.number);
            }
            if (params.page.size) {
                this.addParam(this.getPageConfig().size + '=' + params.page.size);
            }
        }
        if (params.sort && params.sort.length) {
            this.addParam('sort=' + params.sort.join(','));
        }
    }
    getPageConfig() {
        return ((Core.injectedServices.rsJsonapiConfig.parameters && Core.injectedServices.rsJsonapiConfig.parameters.page) || {
            number: 'number',
            size: 'size'
        });
    }
    addParam(param) {
        this.get_params.push(param);
    }
}

function isClonedResource(arg) {
    return arg && arg.toObject && typeof arg.toObject === 'function' && arg.superToObject && typeof arg.superToObject === 'function';
}

class ClonedDocumentResource {
    constructor(cloned_resource, parent_resource, params) {
        // calling toObject two times because we need different objects
        if (parent_resource instanceof Resource) {
            this.parent_resource_object = parent_resource.toObject(params);
        }
        else {
            this.parent_resource_object = { data: parent_resource };
        }
        if (isClonedResource(cloned_resource)) {
            this.resource_object = cloned_resource.superToObject(params);
        }
        else {
            this.resource_object = { data: cloned_resource };
        }
        this.removeDuplicatedAttributes();
        this.removeDuplicatedRelationships();
        this.removeDuplicatedIncludes();
    }
    getResourceObject() {
        return this.resource_object;
    }
    removeDuplicatedIncludes() {
        if (!this.resource_object.included || !this.parent_resource_object.included) {
            return this;
        }
        let parent_included = this.parent_resource_object.included;
        this.resource_object.included = this.resource_object.included.filter(included_resource => {
            return !isEqual(included_resource, parent_included.find(include => include.id === included_resource.id));
        });
        this.resource_object.included = this.resource_object.included.map(included => {
            if (!parent_included.find(include => include.id === included.id)) {
                return included;
            }
            return new ClonedDocumentResource(included, parent_included.find(include => include.id === included.id)).getResourceObject()
                .data;
        });
        return this;
    }
    removeDuplicatedRelationships() {
        if (!this.resource_object.data.relationships || !this.parent_resource_object.data.relationships) {
            return this;
        }
        for (let relationship in this.resource_object.data.relationships) {
            if (isEqual(this.resource_object.data.relationships[relationship], this.parent_resource_object.data.relationships[relationship])) {
                delete this.resource_object.data.relationships[relationship];
            }
        }
        return this;
    }
    removeDuplicatedAttributes() {
        if (!this.resource_object.data.attributes || !this.parent_resource_object.data.attributes) {
            return this;
        }
        for (let attribute in this.resource_object.data.attributes) {
            if (this.resource_object.data.attributes[attribute] === this.parent_resource_object.data.attributes[attribute]) {
                delete this.resource_object.data.attributes[attribute];
            }
        }
        return this;
    }
}

class ClonedResource extends Resource {
    constructor(resource) {
        super();
        // @note using cloneDeep because the parent may have changed since clone (example: data received from socket while editing clone)
        this.parent = cloneDeep(resource);
        this.type = this.parent.type; // this line should go to fill method?
        delete this.relationships; // remove empty relationships object so fill method creates them... how can we improve inheritance to remove this?
        let include = Object.keys(this.parent.relationships);
        this.fill(this.parent.toObject({ include: include }));
        this.copySourceFromParent();
    }
    toObject(params) {
        return new ClonedDocumentResource(this, this.parent, params).getResourceObject();
    }
    superToObject(params) {
        return super.toObject(params);
    }
    copySourceFromParent() {
        this.source = this.parent.source;
        for (let relationship in this.relationships) {
            this.relationships[relationship].source = this.parent.relationships[relationship].source;
        }
    }
}

var __awaiter$4 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Service {
    constructor() {
        this.resource = Resource;
        setTimeout(() => this.register());
    }
    /*
    Register service on Core
    @return true if the resource don't exist and registered ok
    */
    register() {
        if (Core.me === null) {
            throw new Error('Error: you are trying register `' + this.type + '` before inject JsonapiCore somewhere, almost one time.');
        }
        return Core.me.registerService(this);
    }
    /**
     * @deprecated since 2.2.0. Use new() method.
     */
    newResource() {
        return this.new();
    }
    newCollection() {
        return new DocumentCollection();
    }
    new() {
        let resource = new this.resource();
        resource.type = this.type;
        // issue #36: just if service is not registered yet.
        this.getService();
        resource.reset();
        return resource;
    }
    getPrePath() {
        return '';
    }
    getPath() {
        return this.path || this.type;
    }
    getClone(id, params = {}) {
        return this.get(id, params).pipe(map((resource) => {
            // return resource.clone();
            return new ClonedResource(resource);
        }));
    }
    pathForGet(id, params = {}) {
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        let path = new PathBuilder();
        path.applyParams(this, params);
        path.appendPath(id);
        return path.get();
    }
    // if you change this logic, maybe you need to change all()
    get(id, params = {}) {
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        let path = new PathBuilder();
        path.applyParams(this, params);
        path.appendPath(id);
        let resource = this.getOrCreateResource(id);
        resource.setLoaded(false);
        let subject = new BehaviorSubject(resource);
        if (Object.keys(params.fields || []).length > 0) {
            // memory/store cache doesnt support fields
            this.getGetFromServer(path, resource, subject);
        }
        else if (isLive(resource, params.ttl) && relationshipsAreBuilded(resource, params.include || [])) {
            // data on memory and its live
            resource.setLoaded(true);
            setTimeout(() => subject.complete(), 0);
        }
        else if (resource.cache_last_update === 0) {
            // we dont have any data on memory
            this.getGetFromLocal(params, path, resource)
                .then(() => {
                subject.next(resource);
                setTimeout(() => subject.complete(), 0);
            })
                .catch(() => {
                resource.setLoaded(false);
                this.getGetFromServer(path, resource, subject);
            });
        }
        else {
            this.getGetFromServer(path, resource, subject);
        }
        return subject.asObservable();
    }
    // if you change this logic, maybe you need to change getAllFromLocal()
    getGetFromLocal(params = {}, path, resource) {
        return __awaiter$4(this, void 0, void 0, function* () {
            // STORE
            if (!Core.injectedServices.rsJsonapiConfig.cachestore_support) {
                throw new Error('We cant handle this request');
            }
            resource.setLoaded(false);
            // STORE (individual)
            let json_ripper = new JsonRipper();
            let success = yield json_ripper.getResource(JsonRipper.getResourceKey(resource), path.includes);
            resource.fill(success);
            resource.setSource('store');
            // when fields is set, get resource form server
            if (isLive(resource, params.ttl)) {
                resource.setLoadedAndPropagate(true);
                // resource.setBuildedAndPropagate(true);
                return;
            }
            throw new Error('Resource is dead!');
        });
    }
    // if you change this logic, maybe you need to change getAllFromServer()
    getGetFromServer(path, resource, subject) {
        Core.get(path.get()).subscribe(success => {
            resource.fill(success);
            resource.cache_last_update = Date.now();
            resource.setLoadedAndPropagate(true);
            resource.setSourceAndPropagate('server');
            // this.getService().cachememory.setResource(resource, true);
            if (Core.injectedServices.rsJsonapiConfig.cachestore_support) {
                let json_ripper = new JsonRipper();
                json_ripper.saveResource(resource, path.includes);
            }
            subject.next(resource);
            setTimeout(() => subject.complete(), 0);
        }, error => {
            resource.setLoadedAndPropagate(true);
            subject.next(resource);
            subject.error(error);
        });
    }
    getService() {
        return (Converter.getService(this.type) || this.register());
    }
    getOrCreateCollection(path) {
        const service = this.getService();
        const collection = CacheMemory.getInstance().getOrCreateCollection(path.getForCache());
        collection.ttl = service.collections_ttl;
        if (collection.source !== 'new') {
            collection.source = 'memory';
        }
        return collection;
    }
    getOrCreateResource(id) {
        let service = this.getService();
        let resource;
        resource = CacheMemory.getInstance().getResource(this.type, id);
        if (resource === null) {
            resource = service.new();
            resource.id = id;
            CacheMemory.getInstance().setResource(resource, false);
        }
        if (resource.source !== 'new') {
            resource.source = 'memory';
        }
        return resource;
    }
    createResource(id) {
        let service = Converter.getServiceOrFail(this.type);
        let resource = service.new();
        resource.id = id;
        CacheMemory.getInstance().setResource(resource, false);
        return resource;
    }
    /**
     * deprecated since 2.2
     */
    clearCacheMemory() {
        return __awaiter$4(this, void 0, void 0, function* () {
            return this.clearCache();
        });
    }
    clearCache() {
        return __awaiter$4(this, void 0, void 0, function* () {
            let path = new PathBuilder();
            path.applyParams(this);
            // @todo this code is repeated on core.clearCache()
            CacheMemory.getInstance().deprecateCollections(path.getForCache());
            let json_ripper = new JsonRipper();
            return json_ripper.deprecateCollection(path.getForCache()).then(() => true);
        });
    }
    parseToServer(attributes) {
        /* */
    }
    parseFromServer(attributes) {
        /* */
    }
    delete(id, params) {
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        // http request
        let path = new PathBuilder();
        path.applyParams(this, params);
        path.appendPath(id);
        let subject = new Subject();
        Core.delete(path.get()).subscribe(success => {
            CacheMemory.getInstance().removeResource(this.type, id);
            subject.next();
            subject.complete();
        }, error => {
            subject.error(error);
        });
        return subject.asObservable();
    }
    pathForAll(params = {}) {
        let builded_params = Object.assign(Object.assign({}, Base.ParamsCollection), params);
        let path = new PathCollectionBuilder();
        path.applyParams(this, builded_params);
        return path.get();
    }
    // if you change this logic, maybe you need to change get()
    all(params = {}) {
        let builded_params = Object.assign(Object.assign({}, Base.ParamsCollection), params);
        if (!builded_params.ttl && builded_params.ttl !== 0) {
            builded_params.ttl = this.collections_ttl;
        }
        let path = new PathCollectionBuilder();
        path.applyParams(this, builded_params);
        let temporary_collection = this.getOrCreateCollection(path);
        temporary_collection.page.number = builded_params.page.number * 1;
        let subject = new BehaviorSubject(temporary_collection);
        if (Object.keys(builded_params.fields).length > 0) {
            // memory/store cache dont suppont fields
            this.getAllFromServer(path, builded_params, temporary_collection, subject);
        }
        else if (isLive(temporary_collection, builded_params.ttl)) {
            // data on memory and its live
            setTimeout(() => subject.complete(), 0);
        }
        else if (temporary_collection.cache_last_update === 0) {
            // we dont have any data on memory
            temporary_collection.source = 'new';
            this.getAllFromLocal(builded_params, path, temporary_collection)
                .then(() => {
                subject.next(temporary_collection);
                setTimeout(() => {
                    subject.complete();
                }, 0);
            })
                .catch(() => {
                temporary_collection.setLoaded(false);
                this.getAllFromServer(path, builded_params, temporary_collection, subject);
            });
        }
        else {
            this.getAllFromServer(path, builded_params, temporary_collection, subject);
        }
        return subject.asObservable();
    }
    // if you change this logic, maybe you need to change getGetFromLocal()
    getAllFromLocal(params = {}, path, temporary_collection) {
        return __awaiter$4(this, void 0, void 0, function* () {
            // STORE
            if (!Core.injectedServices.rsJsonapiConfig.cachestore_support) {
                throw new Error('We cant handle this request');
            }
            temporary_collection.setLoaded(false);
            let success;
            if (params.store_cache_method === 'compact') {
                // STORE (compact)
                success = yield Core.injectedServices.JsonapiStoreService.getDataObject('collection', path.getForCache() + '.compact');
            }
            else {
                // STORE (individual)
                let json_ripper = new JsonRipper();
                success = yield json_ripper.getCollection(path.getForCache(), path.includes);
            }
            temporary_collection.fill(success);
            temporary_collection.setSourceAndPropagate('store');
            // when fields is set, get resource form server
            if (isLive(temporary_collection, params.ttl)) {
                temporary_collection.setLoadedAndPropagate(true);
                temporary_collection.setBuildedAndPropagate(true);
                return;
            }
            throw new Error('Collection is dead!');
        });
    }
    // if you change this logic, maybe you need to change getGetFromServer()
    getAllFromServer(path, params, temporary_collection, subject) {
        temporary_collection.setLoaded(false);
        Core.get(path.get()).subscribe(success => {
            // this create a new ID for every resource (for caching proposes)
            // for example, two URL return same objects but with different attributes
            // tslint:disable-next-line:deprecation
            if (params.cachehash) {
                for (const key in success.data) {
                    let resource = success.data[key];
                    // tslint:disable-next-line:deprecation
                    resource.id = resource.id + params.cachehash;
                }
            }
            temporary_collection.fill(success);
            temporary_collection.cache_last_update = Date.now();
            temporary_collection.setCacheLastUpdateAndPropagate();
            temporary_collection.setSourceAndPropagate('server');
            temporary_collection.setLoadedAndPropagate(true);
            // this.getService().cachememory.setCollection(path.getForCache(), temporary_collection);
            if (Core.injectedServices.rsJsonapiConfig.cachestore_support) {
                let json_ripper = new JsonRipper();
                json_ripper.saveCollection(path.getForCache(), temporary_collection, path.includes);
            }
            if (Core.injectedServices.rsJsonapiConfig.cachestore_support && params.store_cache_method === 'compact') {
                // @todo migrate to dexie
                Core.injectedServices.JsonapiStoreService.saveCollection(path.getForCache() + '.compact', (success));
            }
            subject.next(temporary_collection);
            setTimeout(() => subject.complete(), 0);
        }, error => {
            temporary_collection.setLoadedAndPropagate(true);
            subject.next(temporary_collection);
            subject.error(error);
        });
    }
}
Service.ɵfac = function Service_Factory(t) { return new (t || Service)(); };
Service.ɵprov = ɵɵdefineInjectable({ token: Service, factory: Service.ɵfac });
/*@__PURE__*/ (function () { ɵsetClassMetadata(Service, [{
        type: Injectable
    }], function () { return []; }, null); })();

/* tslint:disable:file-name-casing */

/**
 * Generated bundle index. Do not edit.
 */

export { Autoregister, Core as JsonapiCore, Resource, DocumentResource, DocumentCollection, Service, setJsonapiInjector, JsonapiInjector, NgxJsonapiModule };
export { HttpClient } from '@angular/common/http';
//# sourceMappingURL=ngx-jsonapi.js.map
