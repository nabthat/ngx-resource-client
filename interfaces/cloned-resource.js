export function isClonedResource(arg) {
    return arg && arg.toObject && typeof arg.toObject === 'function' && arg.superToObject && typeof arg.superToObject === 'function';
}
//# sourceMappingURL=cloned-resource.js.map