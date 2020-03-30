(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/common'), require('@angular/common/http'), require('util'), require('rxjs'), require('dexie'), require('rxjs/operators'), require('lodash')) :
	typeof define === 'function' && define.amd ? define(['exports', '@angular/core', '@angular/common', '@angular/common/http', 'util', 'rxjs', 'dexie', 'rxjs/operators', 'lodash'], factory) :
	(factory((global['ngx-jsonapi'] = {}),global.ng.core,global.common,global.http,global.util,global.rxjs,global.Dexie,global.operators,global.lodash));
}(this, (function (exports,core,common,http,util,rxjs,Dexie,operators,lodash) { 'use strict';

Dexie = Dexie && Dexie.hasOwnProperty('default') ? Dexie['default'] : Dexie;

var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (undefined && undefined.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var Page = /** @class */ (function () {
    function Page() {
        this.number = 1;
        this.total_resources = 0;
        this.size = 0;
        this.resources_per_page = 0; // @deprecated (v2.0.0)
    }
    return Page;
}());
var CacheableHelper = /** @class */ (function () {
    function CacheableHelper() {
    }
    CacheableHelper.propagateLoaded = function (relationships, value) {
        for (var relationship_alias in relationships) {
            var relationship = relationships[relationship_alias];
            if (relationship instanceof DocumentCollection) {
                // we need to add builded, becuase we dont save objects with content='ids'.
                // these relationships are broken (without any data on data)
                relationship.setLoaded(value && relationship.builded);
            }
        }
    };
    return CacheableHelper;
}());
// @note: had to put type-check methods in a different file because the compiler fails otherwise
function implementsIParamsResource(params) {
    return (params.id !== undefined ||
        params.include_get !== undefined ||
        params.include_save !== undefined);
}
var PathBuilder = /** @class */ (function () {
    function PathBuilder() {
        this.paths = [];
        this.includes = [];
        this.get_params = [];
    }
    PathBuilder.prototype.applyParams = function (service, params) {
        if (params === void 0) { params = {}; }
        this.appendPath(service.getPrePath());
        if (params.beforepath) {
            this.appendPath(params.beforepath);
        }
        this.appendPath(service.getPath());
        if (params.include) {
            this.setInclude(params.include);
        }
        if (implementsIParamsResource(params) && params.include_get) {
            this.setInclude(__spreadArrays(this.includes, params.include_get));
        }
        if (params.fields && Object.keys(params.fields).length > 0) {
            for (var resource_type in params.fields) {
                var fields_param = "fields[" + resource_type + "]=" + params.fields[resource_type].join(',');
                this.get_params.push(fields_param);
            }
        }
    };
    PathBuilder.prototype.appendPath = function (value) {
        if (value !== '') {
            this.paths.push(value);
        }
    };
    PathBuilder.prototype.getForCache = function () {
        return this.paths.join('/') + this.get_params.join('/');
    };
    PathBuilder.prototype.get = function () {
        var params = __spreadArrays(this.get_params);
        if (this.includes.length > 0) {
            params.push('include=' + this.includes.join(','));
        }
        return this.paths.join('/') + (params.length > 0 ? Core.injectedServices.rsJsonapiConfig.params_separator + params.join('&') : '');
    };
    PathBuilder.prototype.setInclude = function (strings_array) {
        this.includes = strings_array;
    };
    return PathBuilder;
}());
// import * as angular from 'angular';
var Converter = /** @class */ (function () {
    function Converter() {
    }
    /*
    Convert json arrays (like included) to an indexed Resources array by [type][id]
    */
    Converter.json_array2resources_array_by_type = function (json_array) {
        var all_resources = {};
        var resources_by_type = {};
        Converter.json_array2resources_array(json_array, all_resources);
        for (var key in all_resources) {
            var resource = all_resources[key];
            if (!(resource.type in resources_by_type)) {
                resources_by_type[resource.type] = {};
            }
            resources_by_type[resource.type][resource.id] = resource;
        }
        return resources_by_type;
    };
    Converter.json2resource = function (json_resource, instance_relationships) {
        var resource_service = Converter.getService(json_resource.type);
        if (resource_service) {
            return Converter.procreate(json_resource);
        }
        else {
            if (core.isDevMode()) {
                console.warn('`' + json_resource.type + '`', 'service not found on json2resource().', 'Use @Autoregister() on service and inject it on component.');
            }
            var temp = new Resource();
            temp.id = json_resource.id;
            temp.type = json_resource.type;
            return temp;
        }
    };
    Converter.getService = function (type) {
        var resource_service = Core.me.getResourceService(type);
        return resource_service;
    };
    Converter.getServiceOrFail = function (type) {
        var resource_service = Core.me.getResourceServiceOrFail(type);
        return resource_service;
    };
    Converter.buildIncluded = function (document_from) {
        if ('included' in document_from && document_from.included) {
            return Converter.json_array2resources_array_by_type(document_from.included);
        }
        return {};
    };
    /* return a resource type(resoruce_service) with data(data) */
    Converter.procreate = function (data) {
        if (!('type' in data && 'id' in data)) {
            console.error('Jsonapi Resource is not correct', data);
        }
        var resource = CacheMemory.getInstance().getOrCreateResource(data.type, data.id);
        resource.fill({ data: data });
        resource.is_new = false;
        return resource;
    };
    /*
    Convert json arrays (like included) to an Resources arrays without [keys]
    */
    Converter.json_array2resources_array = function (json_array, destination_array) {
        if (destination_array === void 0) { destination_array = {}; }
        for (var _i = 0, json_array_1 = json_array; _i < json_array_1.length; _i++) {
            var data = json_array_1[_i];
            var resource = Converter.json2resource(data, false);
            destination_array[resource.type + '_' + resource.id] = resource;
        }
    };
    return Converter;
}());
var ResourceRelationshipsConverter = /** @class */ (function () {
    function ResourceRelationshipsConverter(getService, relationships_from, relationships_dest, included_resources) {
        this.getService = getService;
        this.relationships_from = relationships_from;
        this.relationships_dest = relationships_dest;
        this.included_resources = included_resources;
    }
    ResourceRelationshipsConverter.prototype.buildRelationships = function () {
        // recorro los relationships levanto el service correspondiente
        for (var relation_alias in this.relationships_from) {
            var relation_from_value = this.relationships_from[relation_alias];
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
    };
    ResourceRelationshipsConverter.prototype.__buildRelationshipHasMany = function (relation_from_value, relation_alias) {
        if (relation_from_value.data.length === 0) {
            this.relationships_dest[relation_alias] = new DocumentCollection();
            this.relationships_dest[relation_alias].builded = true;
            return;
        }
        this.relationships_dest[relation_alias].fill(relation_from_value);
    };
    ResourceRelationshipsConverter.prototype.__buildRelationshipHasOne = function (relation_data_from, relation_alias) {
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
            var resource_data = this.__buildRelationship(relation_data_from.data);
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
    };
    ResourceRelationshipsConverter.prototype.__buildRelationship = function (resource_data_from) {
        if (resource_data_from.type in this.included_resources &&
            resource_data_from.id in this.included_resources[resource_data_from.type]) {
            // it's in included
            var data = this.included_resources[resource_data_from.type][resource_data_from.id];
            // Store the include in cache
            CacheMemory.getInstance().setResource(data, true);
            // this.getService(resource_data_from.type).cachestore.setResource(data);
            return data;
        }
        else {
            // OPTIONAL: return cached Resource
            var service = this.getService(resource_data_from.type);
            var resource = CacheMemory.getInstance().getResource(resource_data_from.type, resource_data_from.id);
            if (resource) {
                return resource;
            }
        }
    };
    return ResourceRelationshipsConverter;
}());
var Resource = /** @class */ (function () {
    function Resource() {
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
    Resource.prototype.reset = function () {
        this.id = '';
        this.attributes = {};
        this.is_new = true;
        for (var key in this.relationships) {
            this.relationships[key] =
                this.relationships[key] instanceof DocumentCollection ? new DocumentCollection() : new DocumentResource();
        }
    };
    Resource.prototype.toObject = function (params) {
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        var relationships = {};
        var included = [];
        var included_ids = []; // just for control don't repeat any resource
        var included_relationships = params.include || [];
        if (params.include_save) {
            included_relationships = included_relationships.concat(params.include_save);
        }
        // REALTIONSHIPS
        for (var relation_alias in this.relationships) {
            var relationship = this.relationships[relation_alias];
            if (relationship instanceof DocumentCollection) {
                // @TODO PABLO: definir cuál va a ser la propiedd indispensable para guardar la relación
                if (!relationship.builded && (!relationship.data || relationship.data.length === 0)) {
                    delete relationships[relation_alias];
                }
                else {
                    relationships[relation_alias] = { data: [] };
                }
                for (var _i = 0, _a = relationship.data; _i < _a.length; _i++) {
                    var resource = _a[_i];
                    var reational_object = {
                        id: resource.id,
                        type: resource.type
                    };
                    relationships[relation_alias].data.push(reational_object);
                    // no se agregó aún a included && se ha pedido incluir con el parms.include
                    var temporal_id = resource.type + '_' + resource.id;
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
                var relationship_data = relationship.data;
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
                var temporal_id = relationship_data.type + '_' + relationship_data.id;
                if (included_ids.indexOf(temporal_id) === -1 &&
                    included_relationships &&
                    included_relationships.indexOf(relation_alias) !== -1) {
                    included_ids.push(temporal_id);
                    included.push(relationship_data.toObject({}).data);
                }
            }
        }
        // just for performance dont copy if not necessary
        var attributes;
        if (this.getService() && this.getService().parseToServer) {
            attributes = Object.assign({}, this.attributes);
            this.getService().parseToServer(attributes);
        }
        else {
            attributes = this.attributes;
        }
        var ret = {
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
    };
    Resource.prototype.fill = function (data_object) {
        this.id = data_object.data.id || '';
        // WARNING: leaving previous line for a tiem because this can produce undesired behavior
        // this.attributes = data_object.data.attributes || this.attributes;
        this.attributes = Object.assign(Object.assign({}, (this.attributes || {})), data_object.data.attributes);
        this.data_resource = data_object;
        this.is_new = false;
        // NOTE: fix if stored resource has no relationships property
        var service = Converter.getService(data_object.data.type);
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
            var srvc = Converter.getService(this.type);
            if (srvc && 'parseFromServer' in srvc) {
                srvc.parseFromServer(this.attributes);
            }
        }
        if ('cache_last_update' in data_object.data) {
            this.cache_last_update = data_object.data.cache_last_update;
        }
        new ResourceRelationshipsConverter(Converter.getService, data_object.data.relationships || {}, this.relationships, Converter.buildIncluded(data_object)).buildRelationships();
        return true;
    };
    Resource.prototype.addRelationship = function (resource, type_alias) {
        var relation = this.relationships[type_alias || resource.type];
        if (relation instanceof DocumentCollection) {
            relation.replaceOrAdd(resource);
        }
        else {
            relation.data = resource;
        }
    };
    Resource.prototype.addRelationships = function (resources, type_alias) {
        var _this = this;
        if (resources.length === 0) {
            return;
        }
        var relation = this.relationships[type_alias];
        if (!(relation instanceof DocumentCollection)) {
            throw new Error('addRelationships require a DocumentCollection (hasMany) relation.');
        }
        resources.forEach(function (resource) {
            _this.addRelationship(resource, type_alias);
        });
    };
    Resource.prototype.removeRelationship = function (type_alias, id) {
        if (!(type_alias in this.relationships)) {
            return false;
        }
        if (!('data' in this.relationships[type_alias])) {
            return false;
        }
        var relation = this.relationships[type_alias];
        if (relation instanceof DocumentCollection) {
            relation.data = relation.data.filter(function (resource) { return resource.id !== id; });
            if (relation.data.length === 0) {
                // used by toObject() when hasMany is empty
                relation.builded = true;
            }
        }
        else {
            relation.data = null;
        }
        return true;
    };
    Resource.prototype.hasManyRelated = function (resource) {
        return this.relationships[resource] && this.relationships[resource].data.length > 0;
    };
    Resource.prototype.hasOneRelated = function (resource) {
        return Boolean(this.relationships[resource] &&
            this.relationships[resource].data.type &&
            this.relationships[resource].data.type !== '');
    };
    Resource.prototype.restore = function (params) {
        if (params === void 0) { params = {}; }
        params.meta = Object.assign(Object.assign({}, params.meta), { restore: true });
        return this.save(params);
    };
    /*
    @return This resource like a service
    */
    Resource.prototype.getService = function () {
        return Converter.getServiceOrFail(this.type);
    };
    Resource.prototype.delete = function () {
        return this.getService().delete(this.id);
    };
    Resource.prototype.save = function (params) {
        var _this = this;
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        if (this.is_saving || !this.loaded) {
            return rxjs.of({});
        }
        this.is_saving = true;
        var subject = new rxjs.Subject();
        var object = this.toObject(params);
        if (this.id === '') {
            delete object.data.id;
        }
        // http request
        var path = new PathBuilder();
        path.applyParams(this.getService(), params);
        if (this.id) {
            path.appendPath(this.id);
        }
        Core.exec(path.get(), this.is_new ? 'POST' : 'PATCH', object, true).subscribe(function (success) {
            _this.is_saving = false;
            // force reload collections cache (example: we add a new element)
            if (!_this.id) {
                CacheMemory.getInstance().deprecateCollections(path.get());
                var jsonripper = new JsonRipper();
                jsonripper.deprecateCollection(path.get());
            }
            // is a resource?
            if ('id' in success.data) {
                _this.id = success.data.id;
                _this.fill(success);
            }
            else if (util.isArray(success.data)) {
                console.warn('Server return a collection when we save()', success.data);
            }
            subject.next(success);
            subject.complete();
        }, function (error) {
            _this.is_saving = false;
            subject.error('data' in error ? error.data : error);
        });
        return subject.asObservable();
    };
    Resource.prototype.setLoaded = function (value) {
        // tslint:disable-next-line:deprecation
        this.is_loading = !value;
        this.loaded = value;
    };
    Resource.prototype.setLoadedAndPropagate = function (value) {
        this.setLoaded(value);
        CacheableHelper.propagateLoaded(this.relationships, value);
    };
    /** @todo generate interface */
    Resource.prototype.setSource = function (value) {
        this.source = value;
    };
    Resource.prototype.setSourceAndPropagate = function (value) {
        this.setSource(value);
        for (var relationship_alias in this.relationships) {
            var relationship = this.relationships[relationship_alias];
            if (relationship instanceof DocumentCollection) {
                relationship.setSource(value);
            }
        }
    };
    Resource.prototype.setCacheLastUpdate = function (value) {
        if (value === void 0) { value = Date.now(); }
        this.cache_last_update = value;
    };
    return Resource;
}());
var Document = /** @class */ (function () {
    function Document() {
        this.builded = false;
        // deprecated since 2.2.0. Use loaded.
        this.is_loading = true;
        this.loaded = false;
        this.source = 'new';
        this.cache_last_update = 0;
        this.meta = {};
    }
    return Document;
}());
// used for collections on relationships, for parent document use DocumentCollection
var RelatedDocumentCollection = /** @class */ (function (_super) {
    __extends(RelatedDocumentCollection, _super);
    function RelatedDocumentCollection() {
        var _this = _super.apply(this, arguments) || this;
        _this.data = [];
        // public data: Array<Resource | IBasicDataResource> = [];
        _this.page = new Page();
        _this.ttl = 0;
        _this.content = 'ids';
        return _this;
    }
    RelatedDocumentCollection.prototype.trackBy = function (iterated_resource) {
        return iterated_resource.id;
    };
    RelatedDocumentCollection.prototype.find = function (id) {
        if (this.content === 'ids') {
            return null;
        }
        // this is the best way: https://jsperf.com/fast-array-foreach
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i].id === id) {
                return this.data[i];
            }
        }
        return null;
    };
    RelatedDocumentCollection.prototype.fill = function (data_collection) {
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
        var new_ids = {};
        this.data.length = 0;
        this.builded = data_collection.data && data_collection.data.length === 0;
        for (var _i = 0, _a = data_collection.data; _i < _a.length; _i++) {
            var dataresource = _a[_i];
            try {
                var res = this.getResourceOrFail(dataresource);
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
        for (var i = void 0; i < this.data.length; i++) {
            if (!(this.data[i].id in new_ids)) {
                delete this.data[i];
            }
        }
        this.meta = data_collection.meta || {};
        if ('cache_last_update' in data_collection) {
            this.cache_last_update = data_collection.cache_last_update;
        }
    };
    RelatedDocumentCollection.prototype.getResourceOrFail = function (dataresource) {
        var res = this.find(dataresource.id);
        if (res !== null) {
            return res;
        }
        var service = Converter.getService(dataresource.type);
        // remove when getService return null or catch errors
        // this prvent a fill on undefinied service :/
        if (!service) {
            if (core.isDevMode()) {
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
    };
    RelatedDocumentCollection.prototype.replaceOrAdd = function (resource) {
        var res = this.find(resource.id);
        if (res === null) {
            this.data.push(resource);
        }
        else {
            res = resource;
        }
    };
    RelatedDocumentCollection.prototype.hasMorePages = function () {
        if (!this.page.size || this.page.size < 1) {
            return null;
        }
        var total_resources = this.page.size * (this.page.number - 1) + this.data.length;
        return total_resources < this.page.total_resources;
    };
    RelatedDocumentCollection.prototype.setLoaded = function (value) {
        // tslint:disable-next-line:deprecation
        this.is_loading = !value;
        this.loaded = value;
    };
    RelatedDocumentCollection.prototype.setLoadedAndPropagate = function (value) {
        this.setLoaded(value);
        if (this.content === 'ids') {
            return;
        }
        this.data.forEach(function (resource) {
            CacheableHelper.propagateLoaded(resource.relationships, value);
        });
    };
    RelatedDocumentCollection.prototype.setBuilded = function (value) {
        this.builded = value;
    };
    RelatedDocumentCollection.prototype.setBuildedAndPropagate = function (value) {
        this.setBuilded(value);
        if (this.content === 'ids') {
            return;
        }
        this.data.forEach(function (resource) {
            resource.setLoaded(value);
        });
    };
    RelatedDocumentCollection.prototype.setSource = function (value) {
        this.source = value;
    };
    RelatedDocumentCollection.prototype.setSourceAndPropagate = function (value) {
        this.setSource(value);
        this.data.forEach(function (resource) {
            if (resource instanceof Resource) {
                resource.setSource(value);
            }
        });
    };
    RelatedDocumentCollection.prototype.setCacheLastUpdate = function (value) {
        if (value === void 0) { value = Date.now(); }
        this.cache_last_update = value;
    };
    RelatedDocumentCollection.prototype.setCacheLastUpdateAndPropagate = function (value) {
        if (value === void 0) { value = Date.now(); }
        this.setCacheLastUpdate(value);
        this.data.forEach(function (resource) {
            if (resource instanceof Resource) {
                resource.setCacheLastUpdate(value);
            }
        });
    };
    RelatedDocumentCollection.prototype.toObject = function (params) {
        if (!this.builded) {
            return { data: this.data };
        }
        var data = this.data.map(function (resource) {
            return resource.toObject(params).data;
        });
        return {
            data: data
        };
    };
    return RelatedDocumentCollection;
}(Document));
var DocumentCollection = /** @class */ (function (_super) {
    __extends(DocumentCollection, _super);
    function DocumentCollection() {
        var _this = _super.apply(this, arguments) || this;
        _this.data = [];
        _this.content = 'collection';
        return _this;
    }
    return DocumentCollection;
}(RelatedDocumentCollection));
var Base = /** @class */ (function () {
    function Base() {
    }
    Base.newCollection = function () {
        return new DocumentCollection();
    };
    Base.isObjectLive = function (ttl, last_update) {
        return ttl >= 0 && Date.now() <= last_update + ttl * 1000;
    };
    Base.forEach = function (collection, fc) {
        Object.keys(collection).forEach(function (key) {
            fc(collection[key], key);
        });
    };
    return Base;
}());
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
var CacheMemory = /** @class */ (function () {
    function CacheMemory() {
        this.resources = {};
        this.collections = {};
    }
    CacheMemory.getInstance = function () {
        if (!CacheMemory.instance) {
            CacheMemory.instance = new CacheMemory();
        }
        return CacheMemory.instance;
    };
    CacheMemory.prototype.clearCache = function () {
        this.resources = {};
        this.collections = {};
        CacheMemory.instance = null;
    };
    CacheMemory.prototype.getResource = function (type, id) {
        if (this.getKey(type, id) in this.resources) {
            return this.resources[this.getKey(type, id)];
        }
        return null;
    };
    CacheMemory.prototype.getResourceOrFail = function (type, id) {
        if (this.getKey(type, id) in this.resources) {
            return this.resources[this.getKey(type, id)];
        }
        throw new Error('The requested resource does not exist in cache memory');
    };
    CacheMemory.prototype.getKey = function (type, id) {
        return type + '.' + id;
    };
    CacheMemory.prototype.getOrCreateCollection = function (url) {
        if (!(url in this.collections)) {
            this.collections[url] = new DocumentCollection();
            this.collections[url].source = 'new';
        }
        return this.collections[url];
    };
    CacheMemory.prototype.setCollection = function (url, collection) {
        // v1: clone collection, because after maybe delete items for localfilter o pagination
        if (!(url in this.collections)) {
            this.collections[url] = new DocumentCollection();
        }
        for (var i = 0; i < collection.data.length; i++) {
            var resource = collection.data[i];
            // this.collections[url].data.push(resource);
            this.setResource(resource, true);
        }
        this.collections[url].data = collection.data;
        this.collections[url].page = collection.page;
        this.collections[url].cache_last_update = collection.cache_last_update;
    };
    CacheMemory.prototype.getOrCreateResource = function (type, id) {
        var resource = this.getResource(type, id);
        if (resource !== null) {
            return resource;
        }
        resource = Converter.getServiceOrFail(type).new();
        resource.id = id;
        // needed for a lot of request (all and get, tested on multinexo.com)
        this.setResource(resource, false);
        return resource;
    };
    CacheMemory.prototype.setResource = function (resource, update_lastupdate) {
        if (update_lastupdate === void 0) { update_lastupdate = false; }
        if (this.getKey(resource.type, resource.id) in this.resources) {
            this.fillExistentResource(resource);
        }
        else {
            this.resources[this.getKey(resource.type, resource.id)] = resource;
        }
        this.resources[this.getKey(resource.type, resource.id)].cache_last_update = update_lastupdate ? Date.now() : 0;
    };
    CacheMemory.prototype.deprecateCollections = function (path_includes) {
        if (path_includes === void 0) { path_includes = ''; }
        for (var collection_key in this.collections) {
            if (collection_key.includes(path_includes)) {
                this.collections[collection_key].cache_last_update = 0;
            }
        }
        return true;
    };
    CacheMemory.prototype.removeResource = function (type, id) {
        var resource = this.getResource(type, id);
        if (!resource) {
            return;
        }
        Base.forEach(this.collections, function (value, url) {
            value.data.splice(value.data.findIndex(function (resource_on_collection) { return resource_on_collection.type === type && resource_on_collection.id === id; }), 1);
        });
        resource.attributes = {}; // just for confirm deletion on view
        // this.resources[id].relationships = {}; // just for confirm deletion on view
        for (var relationship in resource.relationships) {
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
    };
    CacheMemory.prototype.fillExistentResource = function (source) {
        var destination = this.getResourceOrFail(source.type, source.id);
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
    };
    return CacheMemory;
}());
var DocumentResource = /** @class */ (function (_super) {
    __extends(DocumentResource, _super);
    function DocumentResource() {
        var _this = _super.apply(this, arguments) || this;
        _this.data = new Resource();
        _this.builded = false;
        _this.content = 'id';
        return _this;
    }
    DocumentResource.prototype.fill = function (data_resource) {
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
    };
    DocumentResource.prototype.unsetData = function () {
        this.data = undefined;
        this.builded = false;
    };
    return DocumentResource;
}(Document));
var __awaiter$2 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var DexieDataProvider = /** @class */ (function () {
    function DexieDataProvider() {
        if (DexieDataProvider.db) {
            return;
        }
        DexieDataProvider.db = new Dexie('dexie_data_provider');
        DexieDataProvider.db.version(1).stores({
            collections: '',
            elements: ''
        });
    }
    DexieDataProvider.prototype.getElement = function (key, table_name) {
        if (table_name === void 0) { table_name = 'elements'; }
        return __awaiter$2(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, DexieDataProvider.db.open()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, DexieDataProvider.db.table(table_name).get(key)];
                    case 2:
                        data = _a.sent();
                        if (data === undefined) {
                            throw new Error(key + ' not found.');
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    DexieDataProvider.prototype.getElements = function (keys, table_name) {
        if (table_name === void 0) { table_name = 'elements'; }
        return __awaiter$2(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = {};
                        return [4 /*yield*/, DexieDataProvider.db
                                .table(table_name)
                                .where(':id')
                                .anyOf(keys)
                                .each(function (element) {
                                data[element.data.type + '.' + element.data.id] = element;
                            })];
                    case 1:
                        _a.sent();
                        // we need to maintain same order, database return ordered by key
                        return [2 /*return*/, keys.map(function (key) {
                                return data[key];
                            })];
                }
            });
        });
    };
    // @todo implement dexie.modify(changes)
    // @todo test
    DexieDataProvider.prototype.updateElements = function (key_start_with, changes, table_name) {
        if (table_name === void 0) { table_name = 'elements'; }
        return __awaiter$2(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, DexieDataProvider.db.open().then(function () { return __awaiter$2(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            if (key_start_with === '') {
                                return [2 /*return*/, DexieDataProvider.db.table(table_name).clear()];
                            }
                            else {
                                return [2 /*return*/, DexieDataProvider.db
                                        .table(table_name)
                                        .where(':id')
                                        .startsWith(key_start_with)
                                        .delete()
                                        .then(function () { return undefined; })];
                            }
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    DexieDataProvider.prototype.saveElements = function (elements, table_name) {
        if (table_name === void 0) { table_name = 'elements'; }
        return __awaiter$2(this, void 0, void 0, function () {
            var keys, items;
            return __generator(this, function (_a) {
                keys = [];
                items = elements.map(function (element) {
                    keys.push(element.key);
                    return element.content;
                });
                return [2 /*return*/, DexieDataProvider.db.open().then(function () {
                        DexieDataProvider.db.table(table_name).bulkPut(items, keys);
                    })];
            });
        });
    };
    return DexieDataProvider;
}());
var __awaiter$1 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var JsonRipper = /** @class */ (function () {
    function JsonRipper() {
        this.dataProvider = new DexieDataProvider();
    }
    JsonRipper.prototype.getResource = function (key, include) {
        if (include === void 0) { include = []; }
        return __awaiter$1(this, void 0, void 0, function () {
            var stored_resource, included_keys, included_resources;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDataResources([key])];
                    case 1:
                        stored_resource = (_a.sent()).shift();
                        if (stored_resource === undefined) {
                            throw new Error("Resource " + key + " don't found.");
                        }
                        if (include.length === 0) {
                            return [2 /*return*/, stored_resource];
                        }
                        included_keys = [];
                        include.forEach(function (relationship_alias) {
                            // @NOTE: typescript doesn't detect throwError added a few lines above when stored_resource === undefnied
                            if (!stored_resource || !stored_resource.data.relationships || !stored_resource.data.relationships[relationship_alias]) {
                                // this is a classic problem when relationship property is missing on included resources
                                throw new Error('We dont have relation_alias on stored data resource');
                            }
                            var relationship = stored_resource.data.relationships[relationship_alias].data;
                            if (relationship instanceof Array) {
                                relationship.forEach(function (related_resource) {
                                    included_keys.push(JsonRipper.getResourceKey(related_resource));
                                });
                            }
                            else if (relationship && 'id' in relationship) {
                                included_keys.push(JsonRipper.getResourceKey(relationship));
                            }
                        });
                        return [4 /*yield*/, this.getDataResources(included_keys)];
                    case 2:
                        included_resources = _a.sent();
                        return [2 /*return*/, Object.assign(Object.assign({}, stored_resource), { included: included_resources.map(function (document_resource) { return document_resource.data; }) })];
                }
            });
        });
    };
    JsonRipper.prototype.getCollection = function (url, include) {
        if (include === void 0) { include = []; }
        return __awaiter$1(this, void 0, void 0, function () {
            var stored_collection, data_resources, ret, included_keys, included_resources;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDataCollection(url)];
                    case 1:
                        stored_collection = _a.sent();
                        return [4 /*yield*/, this.getDataResources(stored_collection.keys)];
                    case 2:
                        data_resources = _a.sent();
                        ret = {
                            data: data_resources.map(function (data_resource) { return data_resource.data; }),
                            cache_last_update: stored_collection.updated_at
                        };
                        if (include.length === 0) {
                            return [2 /*return*/, ret];
                        }
                        included_keys = [];
                        include.forEach(function (relationship_alias) {
                            data_resources.forEach(function (resource) {
                                if (!resource.data.relationships || !resource.data.relationships[relationship_alias]) {
                                    return;
                                }
                                var relationship = resource.data.relationships[relationship_alias].data;
                                if (relationship instanceof Array) {
                                    relationship.forEach(function (related_resource) {
                                        included_keys.push(JsonRipper.getResourceKey(related_resource));
                                    });
                                }
                                else if ('id' in relationship) {
                                    included_keys.push(JsonRipper.getResourceKey(relationship));
                                }
                            });
                        });
                        return [4 /*yield*/, this.getDataResources(included_keys)];
                    case 3:
                        included_resources = _a.sent();
                        return [2 /*return*/, Object.assign(Object.assign({}, ret), { included: included_resources.map(function (document_resource) { return document_resource.data; }) })];
                }
            });
        });
    };
    JsonRipper.prototype.getDataCollection = function (url) {
        return __awaiter$1(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dataProvider.getElement(url, 'collections')];
            });
        });
    };
    JsonRipper.prototype.getDataResources = function (keys) {
        return __awaiter$1(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dataProvider.getElements(keys, 'elements')];
            });
        });
    };
    JsonRipper.prototype.saveCollection = function (url, collection, include) {
        if (include === void 0) { include = []; }
        this.dataProvider.saveElements(JsonRipper.collectionToElement(url, collection), 'collections');
        this.dataProvider.saveElements(JsonRipper.collectionResourcesToElements(collection, include), 'elements');
    };
    JsonRipper.prototype.saveResource = function (resource, include) {
        if (include === void 0) { include = []; }
        return __awaiter$1(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dataProvider.saveElements(JsonRipper.toResourceElements(JsonRipper.getResourceKey(resource), resource, include), 'elements')];
            });
        });
    };
    JsonRipper.collectionToElement = function (url, collection) {
        var collection_element = {
            key: url,
            content: { updated_at: Date.now(), keys: [] }
        };
        collection.data.forEach(function (resource) {
            var key = JsonRipper.getResourceKey(resource);
            collection_element.content.keys.push(key);
        });
        return [collection_element];
    };
    JsonRipper.collectionResourcesToElements = function (collection, include) {
        if (include === void 0) { include = []; }
        var elements = [];
        collection.data.forEach(function (resource) {
            var key = JsonRipper.getResourceKey(resource);
            elements.push.apply(elements, JsonRipper.toResourceElements(key, resource, include));
        });
        return elements;
    };
    JsonRipper.toResourceElements = function (key, resource, include) {
        if (include === void 0) { include = []; }
        var elements = [
            {
                key: key,
                content: resource.toObject()
            }
        ];
        elements[0].content.data.cache_last_update = Date.now();
        include.forEach(function (relationship_alias) {
            var relationship = resource.relationships[relationship_alias];
            if (relationship instanceof DocumentCollection) {
                relationship.data.forEach(function (related_resource) {
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
    };
    JsonRipper.getResourceKey = function (resource) {
        return resource.type + '.' + resource.id;
    };
    JsonRipper.getElement = function (resource) {
        return {
            key: JsonRipper.getResourceKey(resource),
            content: resource.toObject()
        };
    };
    JsonRipper.prototype.deprecateCollection = function (key_start_with) {
        return __awaiter$1(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.dataProvider.updateElements(key_start_with, {}, 'collections')];
            });
        });
    };
    return JsonRipper;
}());
function isLive(cacheable, ttl) {
    var ttl_in_seconds = ttl && typeof ttl === 'number' ? ttl : cacheable.ttl || 0;
    return Date.now() < cacheable.cache_last_update + ttl_in_seconds * 1000;
}
// @todo test required for hasMany and hasOne
function relationshipsAreBuilded(resource, includes) {
    if (includes.length === 0) {
        return true;
    }
    for (var relationship_alias in resource.relationships) {
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
    var original = descriptor.value;
    descriptor.value = function () {
        var args = Array.prototype.slice.call(arguments);
        var type;
        try {
            if (typeof args[0] === 'string') {
                type = args[0];
            }
            else {
                type = args[0].type;
            }
        }
        catch (err) {
            console.warn("ERROR: First argument of methods decorated with serviceIsRegistered has to be string or Resource.");
            return null;
        }
        var service_is_registered = Core.me.getResourceService(type);
        if (!service_is_registered) {
            console.warn("ERROR: " + type + " service has not been registered.");
            return null;
        }
        var result = original.apply(this, args);
        return result;
    };
    return descriptor;
}
/**
 * Helper to set the exported {@link AppInjector}, needed as ES6 modules export
 * immutable bindings (see http://2ality.com/2015/07/es6-module-exports.html) for
 * which trying to make changes after using `import {AppInjector}` would throw:
 * "TS2539: Cannot assign to 'AppInjector' because it is not a variable".
 */
function setJsonapiInjector(injector) {
    exports.JsonapiInjector = injector;
    // if (AppInjector) {
    //     // Should not happen
    //     console.error('Programming error: AppInjector was already set');
    // }
    // else {
    // }
}
var JsonapiConfig = /** @class */ (function () {
    function JsonapiConfig() {
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
    return JsonapiConfig;
}());
JsonapiConfig.ɵfac = function JsonapiConfig_Factory(t) { return new (t || JsonapiConfig)(); };
JsonapiConfig.ɵprov = core.ɵɵdefineInjectable({ token: JsonapiConfig, factory: JsonapiConfig.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () {
    core.ɵsetClassMetadata(JsonapiConfig, [{
            type: core.Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], null, null);
})();
var Http = /** @class */ (function () {
    function Http() {
        // NOTE: GET requests are stored in a this object to prevent duplicate requests
        this.get_requests = {};
        // this.http = JsonapiInjector.get(HttpClient)
        this.rsJsonapiConfig = exports.JsonapiInjector.get(JsonapiConfig);
    }
    Http.prototype.setHttpClient = function (http$$1) {
        this.http = http$$1;
    };
    Http.prototype.exec = function (path, method, data) {
        var _this = this;
        var req = {
            body: data || null,
            headers: new http.HttpHeaders({
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json'
            })
        };
        // NOTE: prevent duplicate GET requests
        if (method === 'get') {
            if (!this.get_requests[path]) {
                var obs = this.http.request(method, this.rsJsonapiConfig.url + path, req).pipe(operators.tap(function () {
                    delete _this.get_requests[path];
                }), operators.share());
                this.get_requests[path] = obs;
                return obs;
            }
            return this.get_requests[path];
        }
        return this.http.request(method, this.rsJsonapiConfig.url + path, req).pipe(operators.tap(function () {
            delete _this.get_requests[path];
        }), operators.share());
    };
    return Http;
}());
Http.ɵfac = function Http_Factory(t) { return new (t || Http)(); };
Http.ɵprov = core.ɵɵdefineInjectable({ token: Http, factory: Http.ɵfac });
/*@__PURE__*/ (function () {
    core.ɵsetClassMetadata(Http, [{
            type: core.Injectable
        }], function () { return []; }, null);
})();
var __awaiter$3 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var StoreService /* implements IStoreService */ = /** @class */ (function () {
    function StoreService() {
        this.db = new Dexie('jsonapi_db');
        this.db.version(1).stores({
            collections: '',
            elements: ''
        });
        this.checkIfIsTimeToClean();
    }
    StoreService.prototype.getDataObject = function (type, id_or_url) {
        return __awaiter$3(this, void 0, void 0, function () {
            var table_name, item;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        table_name = type === 'collection' ? 'collections' : 'elements';
                        return [4 /*yield*/, this.db.open()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.db.table(table_name).get(type + '.' + id_or_url)];
                    case 2:
                        item = _a.sent();
                        if (item === undefined) {
                            throw new Error();
                        }
                        return [2 /*return*/, item];
                }
            });
        });
    };
    StoreService.prototype.getDataResources = function (keys) {
        return __awaiter$3(this, void 0, void 0, function () {
            var collection, resources_by_id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        collection = this.db
                            .table('elements')
                            .where(':id')
                            .anyOf(keys);
                        resources_by_id = {};
                        return [4 /*yield*/, collection.each(function (item) {
                                resources_by_id[item.id] = item;
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, resources_by_id];
                }
            });
        });
    };
    StoreService.prototype.saveResource = function (type, url_or_id, value) {
        var _this = this;
        var data_resource_storage = Object.assign({ cache_last_update: Date.now() }, value);
        this.db.open().then(function () { return __awaiter$3(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.db.table('elements').put(data_resource_storage, type + '.' + url_or_id)];
            });
        }); });
    };
    StoreService.prototype.saveCollection = function (url_or_id, value) {
        var _this = this;
        var data_collection_storage = Object.assign({ cache_last_update: Date.now() }, value);
        this.db.open().then(function () { return __awaiter$3(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.db.table('collections').put(data_collection_storage, 'collection.' + url_or_id)];
            });
        }); });
    };
    StoreService.prototype.clearCache = function () {
        var _this = this;
        this.db.open().then(function () { return __awaiter$3(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.db
                        .table('elements')
                        .toCollection()
                        .delete()];
            });
        }); });
        this.db.open().then(function () { return __awaiter$3(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.db
                        .table('collections')
                        .toCollection()
                        .delete()];
            });
        }); });
    };
    StoreService.prototype.deprecateResource = function (type, id) {
        var _this = this;
        this.db.open().then(function () { return __awaiter$3(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.db
                        .table('elements')
                        .where(':id')
                        .startsWith(type + '.' + id)
                        .modify({ cache_last_update: 0 })];
            });
        }); });
    };
    StoreService.prototype.deprecateCollection = function (key_start_with) {
        var _this = this;
        this.db.open().then(function () { return __awaiter$3(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.db
                        .table('collections')
                        .where(':id')
                        .startsWith(key_start_with)
                        .modify({ cache_last_update: 0 })];
            });
        }); });
    };
    StoreService.prototype.removeObjectsWithKey = function (key) {
        return __awaiter$3(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    StoreService.prototype.checkIfIsTimeToClean = function () {
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
    };
    StoreService.prototype.checkAndDeleteOldElements = function () {
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
    };
    return StoreService;
}());
StoreService.ɵfac = function StoreService_Factory(t) { return new (t || StoreService /* implements IStoreService */)(); };
StoreService.ɵprov = core.ɵɵdefineInjectable({ token: StoreService /* implements IStoreService */, factory: StoreService /* implements IStoreService */.ɵfac });
/*@__PURE__*/ (function () {
    core.ɵsetClassMetadata(StoreService /* implements IStoreService */, [{
            type: core.Injectable
        }], function () { return []; }, null);
})();
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
        return Reflect.metadata(k, v);
};
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var Core = /** @class */ (function () {
    function Core() {
        this.loadingsCounter = 0;
        this.loadingsStart = rxjs.noop;
        this.loadingsDone = rxjs.noop;
        this.loadingsError = rxjs.noop;
        this.loadingsOffline = rxjs.noop;
        this.resourceServices = {};
        this.config = new JsonapiConfig();
        var user_config = exports.JsonapiInjector.get(JsonapiConfig);
        var jsonapiStoreService = exports.JsonapiInjector.get(StoreService);
        var jsonapiHttp = exports.JsonapiInjector.get(Http);
        for (var k in this.config) {
            this.config[k] = user_config[k] !== undefined ? user_config[k] : this.config[k];
        }
        Core.me = this;
        Core.injectedServices = {
            JsonapiStoreService: jsonapiStoreService,
            JsonapiHttp: jsonapiHttp,
            rsJsonapiConfig: this.config
        };
    }
    Core.prototype.setHttpClient = function (http$$1) {
        Core.injectedServices.JsonapiHttp.setHttpClient(http$$1);
    };
    Core.delete = function (path) {
        return Core.exec(path, 'DELETE');
    };
    Core.get = function (path) {
        return Core.exec(path, 'get');
    };
    Core.exec = function (path, method, data, call_loadings_error) {
        if (call_loadings_error === void 0) { call_loadings_error = true; }
        Core.me.refreshLoadings(1);
        return Core.injectedServices.JsonapiHttp.exec(path, method, data).pipe(
        // map(data => { return data.body }),
        operators.tap(function () { return Core.me.refreshLoadings(-1); }), operators.catchError(function (error) {
            error = error.error || error;
            Core.me.refreshLoadings(-1);
            if (error.status <= 0) {
                // offline?
                if (!Core.me.loadingsOffline(error) && core.isDevMode()) {
                    console.warn('Jsonapi.Http.exec (use JsonapiCore.loadingsOffline for catch it) error =>', error);
                }
            }
            else if (call_loadings_error && !Core.me.loadingsError(error) && core.isDevMode()) {
                console.warn('Jsonapi.Http.exec (use JsonapiCore.loadingsError for catch it) error =>', error);
            }
            return rxjs.throwError(error);
        }));
    };
    Core.prototype.registerService = function (clase) {
        if (clase.type in this.resourceServices) {
            return false;
        }
        this.resourceServices[clase.type] = clase;
        return clase;
    };
    // @todo this function could return an empty value, fix required
    Core.prototype.getResourceService = function (type) {
        return this.resourceServices[type];
    };
    Core.prototype.getResourceServiceOrFail = function (type) {
        var service = this.resourceServices[type];
        if (!service) {
            throw new Error("The requested service with type " + type + " has not been registered, please use register() method or @Autoregister() decorator");
        }
        return service;
    };
    Core.removeCachedResource = function (resource_type, resource_id) {
        CacheMemory.getInstance().removeResource(resource_type, resource_id);
    };
    Core.setCachedResource = function (resource) {
        CacheMemory.getInstance().setResource(resource, true);
    };
    Core.deprecateCachedCollections = function (type) {
        var service = Core.me.getResourceServiceOrFail(type);
        var path = new PathBuilder();
        path.applyParams(service);
        CacheMemory.getInstance().deprecateCollections(path.getForCache());
    };
    Core.prototype.refreshLoadings = function (factor) {
        this.loadingsCounter += factor;
        if (this.loadingsCounter === 0) {
            this.loadingsDone();
        }
        else if (this.loadingsCounter === 1) {
            this.loadingsStart();
        }
    };
    Core.prototype.clearCache = function () {
        return __awaiter(this, void 0, void 0, function () {
            var json_ripper;
            return __generator(this, function (_a) {
                Core.injectedServices.JsonapiStoreService.clearCache();
                CacheMemory.getInstance().clearCache();
                json_ripper = new JsonRipper();
                return [2 /*return*/, json_ripper.deprecateCollection('').then(function () { return true; })];
            });
        });
    };
    // just an helper
    Core.prototype.duplicateResource = function (resource) {
        var _this = this;
        var relations_alias_to_duplicate_too = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            relations_alias_to_duplicate_too[_i - 1] = arguments[_i];
        }
        var newresource = this.getResourceServiceOrFail(resource.type).new();
        newresource.id = 'new_' + Math.floor(Math.random() * 10000).toString();
        newresource.attributes = Object.assign(Object.assign({}, newresource.attributes), resource.attributes);
        var _loop_1 = function (alias) {
            var relationship = resource.relationships[alias];
            if (!relationship.data) {
                newresource.relationships[alias] = resource.relationships[alias];
                return "continue";
            }
            if ('id' in relationship.data) {
                // relation hasOne
                if (relations_alias_to_duplicate_too.indexOf(alias) > -1) {
                    newresource.addRelationship(this_1.duplicateResource(relationship.data), alias);
                }
                else {
                    newresource.addRelationship(relationship.data, alias);
                }
            }
            else {
                // relation hasMany
                if (relations_alias_to_duplicate_too.indexOf(alias) > -1) {
                    relationship.data.forEach(function (relationresource) {
                        newresource.addRelationship(_this.duplicateResource(relationresource), alias);
                    });
                }
                else {
                    newresource.addRelationships(relationship.data, alias);
                }
            }
        };
        var this_1 = this;
        for (var alias in resource.relationships) {
            _loop_1(alias);
        }
        return newresource;
    };
    return Core;
}());
Core.ɵfac = function Core_Factory(t) { return new (t || Core)(); };
Core.ɵprov = core.ɵɵdefineInjectable({ token: Core, factory: Core.ɵfac });
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
/*@__PURE__*/ (function () {
    core.ɵsetClassMetadata(Core, [{
            type: core.Injectable
        }], function () { return []; }, null);
})();
// import { BrowserModule } from '@angular/platform-browser';
// testing
var NgxJsonapiModule = /** @class */ (function () {
    function NgxJsonapiModule() {
    }
    NgxJsonapiModule.forRoot = function (config) {
        return {
            ngModule: NgxJsonapiModule,
            providers: [{ provide: JsonapiConfig, useValue: config }]
        };
    };
    return NgxJsonapiModule;
}());
NgxJsonapiModule.ɵmod = core.ɵɵdefineNgModule({ type: NgxJsonapiModule });
NgxJsonapiModule.ɵinj = core.ɵɵdefineInjector({ factory: function NgxJsonapiModule_Factory(t) { return new (t || NgxJsonapiModule)(); }, providers: [
        Core,
        StoreService,
        JsonapiConfig,
        Http
    ], imports: [[common.CommonModule],
        // BrowserModule,  // needed by HttpClientModule?
        http.HttpClientModule] });
(function () {
    (typeof ngJitMode === "undefined" || ngJitMode) && core.ɵɵsetNgModuleScope(NgxJsonapiModule, { imports: [common.CommonModule], exports: [
            // BrowserModule,  // needed by HttpClientModule?
            http.HttpClientModule
        ] });
})();
/*@__PURE__*/ (function () {
    core.ɵsetClassMetadata(NgxJsonapiModule, [{
            type: core.NgModule,
            args: [{
                    imports: [common.CommonModule],
                    exports: [
                        // BrowserModule,  // needed by HttpClientModule?
                        http.HttpClientModule
                    ],
                    providers: [
                        Core,
                        StoreService,
                        JsonapiConfig,
                        Http
                    ]
                }]
        }], null, null);
})();
/**
 * @deprecated since version 3.0.0
 */
function Autoregister() {
    return function (target) {
        /**/
    };
}
var UrlParamsBuilder = /** @class */ (function () {
    function UrlParamsBuilder() {
    }
    UrlParamsBuilder.prototype.toparams = function (params) {
        var _this = this;
        var ret = '';
        Base.forEach(params, function (value, key) {
            ret += _this.toparamsarray(value, '&' + key);
        });
        return ret.slice(1);
    };
    UrlParamsBuilder.prototype.toparamsarray = function (params, add) {
        var _this = this;
        var ret = '';
        if (Array.isArray(params)) {
            Base.forEach(params, function (value, key) {
                ret += add + '[]=' + value;
            });
        }
        else if (util.isObject(params)) {
            Base.forEach(params, function (value, key) {
                ret += _this.toparamsarray(value, add + '[' + key + ']');
            });
        }
        else {
            ret += add + '=' + params;
        }
        return ret;
    };
    return UrlParamsBuilder;
}());
var PathCollectionBuilder = /** @class */ (function (_super) {
    __extends(PathCollectionBuilder, _super);
    function PathCollectionBuilder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PathCollectionBuilder.prototype.applyParams = function (service, params) {
        if (params === void 0) { params = {}; }
        _super.prototype.applyParams.call(this, service, params);
        var paramsurl = new UrlParamsBuilder();
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
    };
    PathCollectionBuilder.prototype.getPageConfig = function () {
        return ((Core.injectedServices.rsJsonapiConfig.parameters && Core.injectedServices.rsJsonapiConfig.parameters.page) || {
            number: 'number',
            size: 'size'
        });
    };
    PathCollectionBuilder.prototype.addParam = function (param) {
        this.get_params.push(param);
    };
    return PathCollectionBuilder;
}(PathBuilder));
function isClonedResource(arg) {
    return arg && arg.toObject && typeof arg.toObject === 'function' && arg.superToObject && typeof arg.superToObject === 'function';
}
var ClonedDocumentResource = /** @class */ (function () {
    function ClonedDocumentResource(cloned_resource, parent_resource, params) {
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
    ClonedDocumentResource.prototype.getResourceObject = function () {
        return this.resource_object;
    };
    ClonedDocumentResource.prototype.removeDuplicatedIncludes = function () {
        if (!this.resource_object.included || !this.parent_resource_object.included) {
            return this;
        }
        var parent_included = this.parent_resource_object.included;
        this.resource_object.included = this.resource_object.included.filter(function (included_resource) {
            return !lodash.isEqual(included_resource, parent_included.find(function (include) { return include.id === included_resource.id; }));
        });
        this.resource_object.included = this.resource_object.included.map(function (included) {
            if (!parent_included.find(function (include) { return include.id === included.id; })) {
                return included;
            }
            return new ClonedDocumentResource(included, parent_included.find(function (include) { return include.id === included.id; })).getResourceObject()
                .data;
        });
        return this;
    };
    ClonedDocumentResource.prototype.removeDuplicatedRelationships = function () {
        if (!this.resource_object.data.relationships || !this.parent_resource_object.data.relationships) {
            return this;
        }
        for (var relationship in this.resource_object.data.relationships) {
            if (lodash.isEqual(this.resource_object.data.relationships[relationship], this.parent_resource_object.data.relationships[relationship])) {
                delete this.resource_object.data.relationships[relationship];
            }
        }
        return this;
    };
    ClonedDocumentResource.prototype.removeDuplicatedAttributes = function () {
        if (!this.resource_object.data.attributes || !this.parent_resource_object.data.attributes) {
            return this;
        }
        for (var attribute in this.resource_object.data.attributes) {
            if (this.resource_object.data.attributes[attribute] === this.parent_resource_object.data.attributes[attribute]) {
                delete this.resource_object.data.attributes[attribute];
            }
        }
        return this;
    };
    return ClonedDocumentResource;
}());
var ClonedResource = /** @class */ (function (_super) {
    __extends(ClonedResource, _super);
    function ClonedResource(resource) {
        var _this = _super.call(this) || this;
        // @note using cloneDeep because the parent may have changed since clone (example: data received from socket while editing clone)
        _this.parent = lodash.cloneDeep(resource);
        _this.type = _this.parent.type; // this line should go to fill method?
        delete _this.relationships; // remove empty relationships object so fill method creates them... how can we improve inheritance to remove this?
        var include = Object.keys(_this.parent.relationships);
        _this.fill(_this.parent.toObject({ include: include }));
        _this.copySourceFromParent();
        return _this;
    }
    ClonedResource.prototype.toObject = function (params) {
        return new ClonedDocumentResource(this, this.parent, params).getResourceObject();
    };
    ClonedResource.prototype.superToObject = function (params) {
        return _super.prototype.toObject.call(this, params);
    };
    ClonedResource.prototype.copySourceFromParent = function () {
        this.source = this.parent.source;
        for (var relationship in this.relationships) {
            this.relationships[relationship].source = this.parent.relationships[relationship].source;
        }
    };
    return ClonedResource;
}(Resource));
var __awaiter$4 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var Service = /** @class */ (function () {
    function Service() {
        var _this = this;
        this.resource = Resource;
        setTimeout(function () { return _this.register(); });
    }
    /*
    Register service on Core
    @return true if the resource don't exist and registered ok
    */
    Service.prototype.register = function () {
        if (Core.me === null) {
            throw new Error('Error: you are trying register `' + this.type + '` before inject JsonapiCore somewhere, almost one time.');
        }
        return Core.me.registerService(this);
    };
    /**
     * @deprecated since 2.2.0. Use new() method.
     */
    Service.prototype.newResource = function () {
        return this.new();
    };
    Service.prototype.newCollection = function () {
        return new DocumentCollection();
    };
    Service.prototype.new = function () {
        var resource = new this.resource();
        resource.type = this.type;
        // issue #36: just if service is not registered yet.
        this.getService();
        resource.reset();
        return resource;
    };
    Service.prototype.getPrePath = function () {
        return '';
    };
    Service.prototype.getPath = function () {
        return this.path || this.type;
    };
    Service.prototype.getClone = function (id, params) {
        if (params === void 0) { params = {}; }
        return this.get(id, params).pipe(operators.map(function (resource) {
            // return resource.clone();
            return new ClonedResource(resource);
        }));
    };
    Service.prototype.pathForGet = function (id, params) {
        if (params === void 0) { params = {}; }
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        var path = new PathBuilder();
        path.applyParams(this, params);
        path.appendPath(id);
        return path.get();
    };
    // if you change this logic, maybe you need to change all()
    Service.prototype.get = function (id, params) {
        var _this = this;
        if (params === void 0) { params = {}; }
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        var path = new PathBuilder();
        path.applyParams(this, params);
        path.appendPath(id);
        var resource = this.getOrCreateResource(id);
        resource.setLoaded(false);
        var subject = new rxjs.BehaviorSubject(resource);
        if (Object.keys(params.fields || []).length > 0) {
            // memory/store cache doesnt support fields
            this.getGetFromServer(path, resource, subject);
        }
        else if (isLive(resource, params.ttl) && relationshipsAreBuilded(resource, params.include || [])) {
            // data on memory and its live
            resource.setLoaded(true);
            setTimeout(function () { return subject.complete(); }, 0);
        }
        else if (resource.cache_last_update === 0) {
            // we dont have any data on memory
            this.getGetFromLocal(params, path, resource)
                .then(function () {
                subject.next(resource);
                setTimeout(function () { return subject.complete(); }, 0);
            })
                .catch(function () {
                resource.setLoaded(false);
                _this.getGetFromServer(path, resource, subject);
            });
        }
        else {
            this.getGetFromServer(path, resource, subject);
        }
        return subject.asObservable();
    };
    // if you change this logic, maybe you need to change getAllFromLocal()
    Service.prototype.getGetFromLocal = function (params, path, resource) {
        if (params === void 0) { params = {}; }
        return __awaiter$4(this, void 0, void 0, function () {
            var json_ripper, success;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // STORE
                        if (!Core.injectedServices.rsJsonapiConfig.cachestore_support) {
                            throw new Error('We cant handle this request');
                        }
                        resource.setLoaded(false);
                        json_ripper = new JsonRipper();
                        return [4 /*yield*/, json_ripper.getResource(JsonRipper.getResourceKey(resource), path.includes)];
                    case 1:
                        success = _a.sent();
                        resource.fill(success);
                        resource.setSource('store');
                        // when fields is set, get resource form server
                        if (isLive(resource, params.ttl)) {
                            resource.setLoadedAndPropagate(true);
                            // resource.setBuildedAndPropagate(true);
                            return [2 /*return*/];
                        }
                        throw new Error('Resource is dead!');
                }
            });
        });
    };
    // if you change this logic, maybe you need to change getAllFromServer()
    Service.prototype.getGetFromServer = function (path, resource, subject) {
        Core.get(path.get()).subscribe(function (success) {
            resource.fill(success);
            resource.cache_last_update = Date.now();
            resource.setLoadedAndPropagate(true);
            resource.setSourceAndPropagate('server');
            // this.getService().cachememory.setResource(resource, true);
            if (Core.injectedServices.rsJsonapiConfig.cachestore_support) {
                var json_ripper = new JsonRipper();
                json_ripper.saveResource(resource, path.includes);
            }
            subject.next(resource);
            setTimeout(function () { return subject.complete(); }, 0);
        }, function (error) {
            resource.setLoadedAndPropagate(true);
            subject.next(resource);
            subject.error(error);
        });
    };
    Service.prototype.getService = function () {
        return (Converter.getService(this.type) || this.register());
    };
    Service.prototype.getOrCreateCollection = function (path) {
        var service = this.getService();
        var collection = CacheMemory.getInstance().getOrCreateCollection(path.getForCache());
        collection.ttl = service.collections_ttl;
        if (collection.source !== 'new') {
            collection.source = 'memory';
        }
        return collection;
    };
    Service.prototype.getOrCreateResource = function (id) {
        var service = this.getService();
        var resource;
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
    };
    Service.prototype.createResource = function (id) {
        var service = Converter.getServiceOrFail(this.type);
        var resource = service.new();
        resource.id = id;
        CacheMemory.getInstance().setResource(resource, false);
        return resource;
    };
    /**
     * deprecated since 2.2
     */
    Service.prototype.clearCacheMemory = function () {
        return __awaiter$4(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.clearCache()];
            });
        });
    };
    Service.prototype.clearCache = function () {
        return __awaiter$4(this, void 0, void 0, function () {
            var path, json_ripper;
            return __generator(this, function (_a) {
                path = new PathBuilder();
                path.applyParams(this);
                // @todo this code is repeated on core.clearCache()
                CacheMemory.getInstance().deprecateCollections(path.getForCache());
                json_ripper = new JsonRipper();
                return [2 /*return*/, json_ripper.deprecateCollection(path.getForCache()).then(function () { return true; })];
            });
        });
    };
    Service.prototype.parseToServer = function (attributes) {
        /* */
    };
    Service.prototype.parseFromServer = function (attributes) {
        /* */
    };
    Service.prototype.delete = function (id, params) {
        var _this = this;
        params = Object.assign(Object.assign({}, Base.ParamsResource), params);
        // http request
        var path = new PathBuilder();
        path.applyParams(this, params);
        path.appendPath(id);
        var subject = new rxjs.Subject();
        Core.delete(path.get()).subscribe(function (success) {
            CacheMemory.getInstance().removeResource(_this.type, id);
            subject.next();
            subject.complete();
        }, function (error) {
            subject.error(error);
        });
        return subject.asObservable();
    };
    Service.prototype.pathForAll = function (params) {
        if (params === void 0) { params = {}; }
        var builded_params = Object.assign(Object.assign({}, Base.ParamsCollection), params);
        var path = new PathCollectionBuilder();
        path.applyParams(this, builded_params);
        return path.get();
    };
    // if you change this logic, maybe you need to change get()
    Service.prototype.all = function (params) {
        var _this = this;
        if (params === void 0) { params = {}; }
        var builded_params = Object.assign(Object.assign({}, Base.ParamsCollection), params);
        if (!builded_params.ttl && builded_params.ttl !== 0) {
            builded_params.ttl = this.collections_ttl;
        }
        var path = new PathCollectionBuilder();
        path.applyParams(this, builded_params);
        var temporary_collection = this.getOrCreateCollection(path);
        temporary_collection.page.number = builded_params.page.number * 1;
        var subject = new rxjs.BehaviorSubject(temporary_collection);
        if (Object.keys(builded_params.fields).length > 0) {
            // memory/store cache dont suppont fields
            this.getAllFromServer(path, builded_params, temporary_collection, subject);
        }
        else if (isLive(temporary_collection, builded_params.ttl)) {
            // data on memory and its live
            setTimeout(function () { return subject.complete(); }, 0);
        }
        else if (temporary_collection.cache_last_update === 0) {
            // we dont have any data on memory
            temporary_collection.source = 'new';
            this.getAllFromLocal(builded_params, path, temporary_collection)
                .then(function () {
                subject.next(temporary_collection);
                setTimeout(function () {
                    subject.complete();
                }, 0);
            })
                .catch(function () {
                temporary_collection.setLoaded(false);
                _this.getAllFromServer(path, builded_params, temporary_collection, subject);
            });
        }
        else {
            this.getAllFromServer(path, builded_params, temporary_collection, subject);
        }
        return subject.asObservable();
    };
    // if you change this logic, maybe you need to change getGetFromLocal()
    Service.prototype.getAllFromLocal = function (params, path, temporary_collection) {
        if (params === void 0) { params = {}; }
        return __awaiter$4(this, void 0, void 0, function () {
            var success, json_ripper;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // STORE
                        if (!Core.injectedServices.rsJsonapiConfig.cachestore_support) {
                            throw new Error('We cant handle this request');
                        }
                        temporary_collection.setLoaded(false);
                        if (!(params.store_cache_method === 'compact')) return [3 /*break*/, 2];
                        return [4 /*yield*/, Core.injectedServices.JsonapiStoreService.getDataObject('collection', path.getForCache() + '.compact')];
                    case 1:
                        // STORE (compact)
                        success = _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        json_ripper = new JsonRipper();
                        return [4 /*yield*/, json_ripper.getCollection(path.getForCache(), path.includes)];
                    case 3:
                        success = _a.sent();
                        _a.label = 4;
                    case 4:
                        temporary_collection.fill(success);
                        temporary_collection.setSourceAndPropagate('store');
                        // when fields is set, get resource form server
                        if (isLive(temporary_collection, params.ttl)) {
                            temporary_collection.setLoadedAndPropagate(true);
                            temporary_collection.setBuildedAndPropagate(true);
                            return [2 /*return*/];
                        }
                        throw new Error('Collection is dead!');
                }
            });
        });
    };
    // if you change this logic, maybe you need to change getGetFromServer()
    Service.prototype.getAllFromServer = function (path, params, temporary_collection, subject) {
        temporary_collection.setLoaded(false);
        Core.get(path.get()).subscribe(function (success) {
            // this create a new ID for every resource (for caching proposes)
            // for example, two URL return same objects but with different attributes
            // tslint:disable-next-line:deprecation
            if (params.cachehash) {
                for (var key in success.data) {
                    var resource = success.data[key];
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
                var json_ripper = new JsonRipper();
                json_ripper.saveCollection(path.getForCache(), temporary_collection, path.includes);
            }
            if (Core.injectedServices.rsJsonapiConfig.cachestore_support && params.store_cache_method === 'compact') {
                // @todo migrate to dexie
                Core.injectedServices.JsonapiStoreService.saveCollection(path.getForCache() + '.compact', (success));
            }
            subject.next(temporary_collection);
            setTimeout(function () { return subject.complete(); }, 0);
        }, function (error) {
            temporary_collection.setLoadedAndPropagate(true);
            subject.next(temporary_collection);
            subject.error(error);
        });
    };
    return Service;
}());
Service.ɵfac = function Service_Factory(t) { return new (t || Service)(); };
Service.ɵprov = core.ɵɵdefineInjectable({ token: Service, factory: Service.ɵfac });
/*@__PURE__*/ (function () {
    core.ɵsetClassMetadata(Service, [{
            type: core.Injectable
        }], function () { return []; }, null);
})();

exports.Autoregister = Autoregister;
exports.JsonapiCore = Core;
exports.Resource = Resource;
exports.DocumentResource = DocumentResource;
exports.DocumentCollection = DocumentCollection;
exports.Service = Service;
exports.setJsonapiInjector = setJsonapiInjector;
exports.NgxJsonapiModule = NgxJsonapiModule;
exports.HttpClient = http.HttpClient;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ngx-jsonapi.umd.js.map
