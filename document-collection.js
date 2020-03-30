import { CacheableHelper } from './services/cacheable-helper.';
import { Resource } from './resource';
import { Page } from './services/page';
import { Document } from './document';
import { Converter } from './services/converter';
import { isDevMode } from '@angular/core';
// used for collections on relationships, for parent document use DocumentCollection
export class RelatedDocumentCollection extends Document {
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
export class DocumentCollection extends RelatedDocumentCollection {
    constructor() {
        super(...arguments);
        this.data = [];
        this.content = 'collection';
    }
}
//# sourceMappingURL=document-collection.js.map