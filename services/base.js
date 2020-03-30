import { Page } from './page';
import { DocumentCollection } from '../document-collection';
export class Base {
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
//# sourceMappingURL=base.js.map