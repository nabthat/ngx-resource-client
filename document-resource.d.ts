import { Resource } from './resource';
import { Document } from './document';
import { IDocumentResource } from './interfaces/data-object';
export declare class DocumentResource<R extends Resource = Resource> extends Document {
    data: R | null | undefined;
    builded: boolean;
    content: 'id' | 'resource';
    data_resource: IDocumentResource | null;
    fill(data_resource: IDocumentResource | null): void;
    unsetData(): void;
}
