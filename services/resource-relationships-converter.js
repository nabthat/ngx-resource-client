import { CacheMemory } from './cachememory';
import { Resource } from '../resource';
import { DocumentCollection } from '../document-collection';
import { DocumentResource } from '../document-resource';
export class ResourceRelationshipsConverter {
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
//# sourceMappingURL=resource-relationships-converter.js.map