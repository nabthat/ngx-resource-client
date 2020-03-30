import { IDocumentResource } from '../interfaces/data-object';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IDocumentData } from '../interfaces/document';
import * as i0 from "@angular/core";
export declare class Http {
    get_requests: {
        [key: string]: Observable<IDocumentData>;
    };
    private http;
    private rsJsonapiConfig;
    constructor();
    setHttpClient(http: HttpClient): void;
    exec(path: string, method: string, data?: IDocumentResource): Observable<IDocumentData>;
    static ɵfac: i0.ɵɵFactoryDef<Http>;
    static ɵprov: i0.ɵɵInjectableDef<Http>;
}
