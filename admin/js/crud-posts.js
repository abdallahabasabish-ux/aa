import { db } from "../../site/js/firebase-init.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { showToast } from './admin-app.js';

let data = [];

export async function renderPosts(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-toolbar">
                <h3>إدارة المقالات</h3>
                <button class="btn btn-primary-sm" id="addBtn"><i class="fas fa-plus"></i> إضافة مقالة</button>
            </div>
            <table><thead><tr><th>#</th><th>العنوان</th><th>الحالة</th><th>التاريخ</th><th>الإجراءات</th></tr></thead>
            <tbody id="tbody"><tr><td colspan="5">جاري التحميل...</td></tr></tbody></table>
        </div>
    `;
    await loadData();
    document.getElementById('addBtn').onclick = () => openForm();
}

async function loadData() {
    const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
    data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tbody');
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="5">لا توجد مقالات</td></tr>`; return; }
    tbody.innerHTML = data.map((item, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${item.title}</td>
            <td><span class="badge-status ${item.status === 'published' ? 'active' : 'inactive'}">${item.status === 'published' ? 'منشور' : 'مسودة'}</span></td>
            <td>${item.publishedAt ? new Date(item.publishedAt.seconds * 1000).toLocaleDateString('ar-SA') : '-'}</td>
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
    document.getElementById('modalTitle').textContent = id ? 'تعديل مقالة' : 'إضافة مقالة جديدة';
    document.getElementById('modalBody').innerHTML = `
        <form id="form">
            <div class="form-row">
                <div class="form-group"><label>العنوان (عربي)</label><input type="text" id="p_title" value="${item?.title || ''}" required /></div>
                <div class="form-group"><label>العنوان (إنجليزي)</label><input type="text" id="p_title_en" value="${item?.title_en || ''}" /></div>
            </div>
            <div class="form-group"><label>المحتوى (عربي)</label><textarea id="p_content" rows="5">${item?.content || ''}</textarea></div>
            <div class="form-group"><label>المحتوى (إنجليزي)</label><textarea id="p_content_en" rows="5">${item?.content_en || ''}</textarea></div>
            <div class="form-group"><label>الملخص (عربي)</label><textarea id="p_excerpt" rows="2">${item?.excerpt || ''}</textarea></div>
            <div class="form-group"><label>الملخص (إنجليزي)</label><textarea id="p_excerpt_en" rows="2">${item?.excerpt_en || ''}</textarea></div>
            <div class="form-group"><label>الوسوم (مفصولة بفاصلة)</label><input type="text" id="p_tags" value="${item?.tags?.join(', ') || ''}" /></div>
            <div class="form-row">
                <div class="form-group"><label>الحالة</label><select id="p_status"><option value="draft" ${item?.status === 'draft' ? 'selected' : ''}>مسودة</option><option value="published" ${item?.status === 'published' ? 'selected' : ''}>منشور</option></select></div>
                <div class="form-group"><label>مميز</label><select id="p_featured"><option value="true" ${item?.featured ? 'selected' : ''}>نعم</option><option value="false" ${!item?.featured ? 'selected' : ''}>لا</option></select></div>
            </div>
            <input type="hidden" id="p_id" value="${id || ''}" />
        </form>
    `;
    modal.classList.add('show');
    document.getElementById('modalConfirm').textContent = id ? 'تحديث' : 'إضافة';
    document.getElementById('modalConfirm').onclick = async () => {
        const tags = document.getElementById('p_tags').value.split(',').map(s => s.trim()).filter(Boolean);
        const data = {
            title: document.getElementById('p_title').value,
            title_en: document.getElementById('p_title_en').value,
            content: document.getElementById('p_content').value,
            content_en: document.getElementById('p_content_en').value,
            excerpt: document.getElementById('p_excerpt').value,
            excerpt_en: document.getElementById('p_excerpt_en').value,
            tags,
            status: document.getElementById('p_status').value,
            featured: document.getElementById('p_featured').value === 'true',
            updatedAt: new Date()
        };
        if (data.status === 'published' && !item?.publishedAt) data.publishedAt = new Date();
        try {
            if (id) { await updateDoc(doc(db, "posts", id), data); showToast('تم التحديث'); }
            else { data.createdAt = new Date(); await addDoc(collection(db, "posts"), data); showToast('تم الإضافة'); }
            modal.classList.remove('show'); loadData();
        } catch (e) { showToast(e.message, 'error'); }
    };
}

async function deleteHandler(id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        await deleteDoc(doc(db, "posts", id));
        showToast('تم الحذف');
        loadData();
    }
}
