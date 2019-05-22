/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
import { Page } from './services/page';
import { Document } from './document';
import { Converter } from './services/converter';
// unsupported: template constraints.
/**
 * @template R
 */
export class DocumentCollection extends Document {
    constructor() {
        super(...arguments);
        this.data = [];
        this.page = new Page();
    }
    /**
     * @param {?} iterated_resource
     * @return {?}
     */
    trackBy(iterated_resource) {
        return iterated_resource.id;
    }
    /**
     * @param {?} id
     * @return {?}
     */
    find(id) {
        // this is the best way: https://jsperf.com/fast-array-foreach
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].id === id) {
                return this.data[i];
            }
        }
        return null;
    }
    /**
     * @param {?} data_collection
     * @param {?=} included_resources
     * @return {?}
     */
    fill(data_collection, included_resources) {
        this.data_collection = data_collection;
        included_resources = included_resources || Converter.buildIncluded(data_collection);
        // sometimes get Cannot set property 'number' of undefined (page)
        if (this.page && data_collection.meta) {
            this.page.number = data_collection.meta["page"] || 1;
            this.page.resources_per_page = data_collection.meta["resources_per_page"] || null; // @deprecated (v2.0.2)
            this.page.size = data_collection.meta["resources_per_page"] || null;
            this.page.total_resources = data_collection.meta["total_resources"] || null;
        }
        /** @type {?} */
        let new_ids = {};
        this.data = [];
        this.builded = data_collection.data && data_collection.data.length === 0;
        for (let dataresource of data_collection.data) {
            /** @type {?} */
            let res = this.find(dataresource.id) || Converter.getService(dataresource.type).getOrCreateResource(dataresource.id);
            res.fill({ data: dataresource }, included_resources); // @todo check with included resources?
            new_ids[dataresource.id] = dataresource.id;
            this.data.push(/** @type {?} */ (res));
            if (Object.keys(res.attributes).length > 0) {
                this.builded = true;
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
    }
    /**
     * @param {?} resource
     * @return {?}
     */
    replaceOrAdd(resource) {
        /** @type {?} */
        let res = this.find(resource.id);
        if (res === null) {
            this.data.push(resource);
        }
        else {
            res = resource;
        }
    }
    /**
     * @return {?}
     */
    hasMorePages() {
        if (this.page.size < 1) {
            return null;
        }
        /** @type {?} */
        let total_resources = this.page.size * (this.page.number - 1) + this.data.length;
        return total_resources < this.page.total_resources;
    }
}
if (false) {
    /** @type {?} */
    DocumentCollection.prototype.data;
    /** @type {?} */
    DocumentCollection.prototype.page;
    /** @type {?} */
    DocumentCollection.prototype.data_collection;
}
//# sourceMappingURL=document-collection.js.map