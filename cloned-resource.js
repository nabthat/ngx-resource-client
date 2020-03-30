import { Resource } from './resource';
import { ClonedDocumentResource } from './cloned-document-resource';
import { cloneDeep } from 'lodash';
export class ClonedResource extends Resource {
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
//# sourceMappingURL=cloned-resource.js.map