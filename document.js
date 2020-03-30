export /* abstract */ class Document {
    constructor() {
        this.builded = false;
        // deprecated since 2.2.0. Use loaded.
        this.is_loading = true;
        this.loaded = false;
        this.source = 'new';
        this.cache_last_update = 0;
        this.meta = {};
    }
}
//# sourceMappingURL=document.js.map