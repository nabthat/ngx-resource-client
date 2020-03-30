// @note: had to put type-check methods in a different file because the compiler fails otherwise
export function implementsIParamsResource(params) {
    return (params.id !== undefined ||
        params.include_get !== undefined ||
        params.include_save !== undefined);
}
//# sourceMappingURL=type-checks.js.map