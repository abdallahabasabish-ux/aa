// js/utils.js
/**
 * بديل آمن لـ innerHTML لتجنب XSS
 */
export function createSafeElement(tag, props = {}, children = []) {
    const element = document.createElement(tag);
    
    // تعيين الخصائص (مع تجنب innerHTML)
    Object.keys(props).forEach(key => {
        if (key === 'textContent') {
            element.textContent = props[key];
        } else if (key === 'className') {
            element.className = props[key];
        } else if (key === 'id') {
            element.id = props[key];
        } else {
            element.setAttribute(key, props[key]);
        }
    });

    // إضافة الأطفال (نصوص أو عناصر)
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });

    return element;
}

/**
 * بناء جدول آمن من بيانات Firestore
 */
export function buildSafeTable(dataArray, columns, rowRenderer) {
    const fragment = document.createDocumentFragment();
    dataArray.forEach((doc) => {
        const row = rowRenderer(doc);
        fragment.appendChild(row);
    });
    return fragment;
}
