import { CacheMemory } from './services/cachememory';
import { Resource } from './resource';
import { Document } from './document';
export class DocumentResource extends Document {
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
//# sourceMappingURL=document-resource.js.map