const order = JSON.parse('[{"key":"blog","enabled":true,"navLabel":"Giải Mã Clowcat"}]');
const rows = order.map((obj, i) => {
    if (typeof obj === 'string') return [String(obj).trim(), i + 1, true, ''];
    return [String(obj.key).trim(), i + 1, !!obj.enabled, obj.navLabel || ''];
});
console.log(rows);
