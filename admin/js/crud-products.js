import { db } from "../../site/js/firebase-init.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { showToast } from './admin-app.js';

let data = [];

export async function renderProducts(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-toolbar">
                <h3>إدارة المنتجات</h3>
                <button class="btn btn-primary-sm" id="addBtn"><i class="fas fa-plus"></i> إضافة منتج</button>
            </div>
            <table><thead><tr><th>#</th><th>العنوان</th><th>النوع</th><th>السعر</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
            <tbody id="tbody"><tr><td colspan="6">جاري التحميل...</td></tr></tbody></table>
        </div>
    `;
    await loadData();
    document.getElementById('addBtn').onclick = () => openForm();
}

async function loadData() {
    const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
    data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tbody');
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="6">لا توجد منتجات</td></tr>`; return; }
    tbody.innerHTML = data.map((item, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${item.title}</td>
            <td><span class="badge-status">${item.type === 'free' ? 'مجاني' : 'مدفوع'}</span></td>
            <td>${item.price || 0} ${item.currency || 'SAR'}</td>
            <td><span class="badge-status ${item.active ? 'active' : 'inactive'}">${item.active ? 'منشور' : 'غير منشور'}</span></td>
            <td>
                <button class="btn btn-warning-sm" onclick="window.editItem('${item.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger-sm" onclick="window.deleteItem('${item.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    window.editItem = (id) => openForm(id);
    window.deleteItem = (id) => deleteHandler(id);
}

function openForm(id = null) {
    const item = id ? data.find(d => d.id === id) : null;
    const modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = id ? 'تعديل منتج' : 'إضافة منتج جديد';
    document.getElementById('modalBody').innerHTML = `
        <form id="form">
            <div class="form-row">
                <div class="form-group"><label>العنوان (عربي)</label><input type="text" id="p_title" value="${item?.title || ''}" required /></div>
                <div class="form-group"><label>العنوان (إنجليزي)</label><input type="text" id="p_title_en" value="${item?.title_en || ''}" /></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>النوع</label><select id="p_type"><option value="free" ${item?.type === 'free' ? 'selected' : ''}>مجاني</option><option value="paid" ${item?.type === 'paid' ? 'selected' : ''}>مدفوع</option></select></div>
                <div class="form-group"><label>السعر</label><input type="number" id="p_price" value="${item?.price || 0}" /></div>
            </div>
            <div class="form-group"><label>الوصف (عربي)</label><textarea id="p_desc" rows="2">${item?.description || ''}</textarea></div>
            <div class="form-group"><label>الوصف (إنجليزي)</label><textarea id="p_desc_en" rows="2">${item?.description_en || ''}</textarea></div>
            <div class="form-group"><label>رابط التحميل (للمجاني فقط)</label><input type="url" id="p_download" value="${item?.downloadUrl || ''}" /></div>
            <div class="form-row">
                <div class="form-group"><label>منشور</label><select id="p_active"><option value="true" ${item?.active !== false ? 'selected' : ''}>نعم</option><option value="false" ${item?.active === false ? 'selected' : ''}>لا</option></select></div>
                <div class="form-group"><label>مميز</label><select id="p_featured"><option value="true" ${item?.featured ? 'selected' : ''}>نعم</option><option value="false" ${!item?.featured ? 'selected' : ''}>لا</option></select></div>
            </div>
            <input type="hidden" id="p_id" value="${id || ''}" />
        </form>
    `;
    modal.classList.add('show');
    document.getElementById('modalConfirm').textContent = id ? 'تحديث' : 'إضافة';
    document.getElementById('modalConfirm').onclick = async () => {
        const data = {
            title: document.getElementById('p_title').value,
            title_en: document.getElementById('p_title_en').value,
            type: document.getElementById('p_type').value,
            price: parseFloat(document.getElementById('p_price').value) || 0,
            description: document.getElementById('p_desc').value,
            description_en: document.getElementById('p_desc_en').value,
            downloadUrl: document.getElementById('p_download').value,
            active: document.getElementById('p_active').value === 'true',
            featured: document.getElementById('p_featured').value === 'true',
            updatedAt: new Date()
        };
        try {
            if (id) { await updateDoc(doc(db, "products", id), data); showToast('تم التحديث'); }
            else { data.createdAt = new Date(); await addDoc(collection(db, "products"), data); showToast('تم الإضافة'); }
            modal.classList.remove('show'); loadData();
        } catch (e) { showToast(e.message, 'error'); }
    };
}

async function deleteHandler(id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        await deleteDoc(doc(db, "products", id));
        showToast('تم الحذف');
        loadData();
    }
}
