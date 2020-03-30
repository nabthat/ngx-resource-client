import { DocumentCollection } from './../document-collection';
export class CacheableHelper {
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
//# sourceMappingURL=cacheable-helper..js.map