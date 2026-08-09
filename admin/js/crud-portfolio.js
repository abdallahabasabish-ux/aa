import { db } from "../../site/js/firebase-init.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { showToast } from './admin-app.js';

let data = [];

export async function renderPortfolio(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-toolbar">
                <h3>إدارة معرض الأعمال</h3>
                <button class="btn btn-primary-sm" id="addBtn"><i class="fas fa-plus"></i> إضافة مشروع</button>
            </div>
            <table><thead><tr><th>#</th><th>العنوان</th><th>التقنيات</th><th>مميز</th><th>الإجراءات</th></tr></thead>
            <tbody id="tbody"><tr><td colspan="5">جاري التحميل...</td></tr></tbody></table>
        </div>
    `;
    await loadData();
    document.getElementById('addBtn').onclick = () => openForm();
}

async function loadData() {
    const snap = await getDocs(query(collection(db, "portfolio"), orderBy("createdAt", "desc")));
    data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tbody');
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="5">لا توجد مشاريع</td></tr>`; return; }
    tbody.innerHTML = data.map((item, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${item.title}</td>
            <td>${item.technologies?.join(', ') || '-'}</td>
            <td>${item.featured ? '⭐' : '-'}</td>
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
    document.getElementById('modalTitle').textContent = id ? 'تعديل مشروع' : 'إضافة مشروع جديد';
    document.getElementById('modalBody').innerHTML = `
        <form id="form">
            <div class="form-row">
                <div class="form-group"><label>العنوان (عربي)</label><input type="text" id="pf_title" value="${item?.title || ''}" required /></div>
                <div class="form-group"><label>العنوان (إنجليزي)</label><input type="text" id="pf_title_en" value="${item?.title_en || ''}" /></div>
            </div>
            <div class="form-group"><label>الوصف (عربي)</label><textarea id="pf_desc" rows="2">${item?.description || ''}</textarea></div>
            <div class="form-group"><label>الوصف (إنجليزي)</label><textarea id="pf_desc_en" rows="2">${item?.description_en || ''}</textarea></div>
            <div class="form-group"><label>التقنيات (مفصولة بفاصلة)</label><input type="text" id="pf_tech" value="${item?.technologies?.join(', ') || ''}" /></div>
            <div class="form-row">
                <div class="form-group"><label>رابط المشروع</label><input type="url" id="pf_url" value="${item?.projectUrl || ''}" /></div>
                <div class="form-group"><label>رابط العرض</label><input type="url" id="pf_demo" value="${item?.demoUrl || ''}" /></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>مميز</label><select id="pf_featured"><option value="true" ${item?.featured ? 'selected' : ''}>نعم</option><option value="false" ${!item?.featured ? 'selected' : ''}>لا</option></select></div>
                <div class="form-group"><label>منشور</label><select id="pf_active"><option value="true" ${item?.active !== false ? 'selected' : ''}>نعم</option><option value="false" ${item?.active === false ? 'selected' : ''}>لا</option></select></div>
            </div>
            <input type="hidden" id="pf_id" value="${id || ''}" />
        </form>
    `;
    modal.classList.add('show');
    document.getElementById('modalConfirm').textContent = id ? 'تحديث' : 'إضافة';
    document.getElementById('modalConfirm').onclick = async () => {
        const technologies = document.getElementById('pf_tech').value.split(',').map(s => s.trim()).filter(Boolean);
        const data = {
            title: document.getElementById('pf_title').value,
            title_en: document.getElementById('pf_title_en').value,
            description: document.getElementById('pf_desc').value,
            description_en: document.getElementById('pf_desc_en').value,
            technologies,
            projectUrl: document.getElementById('pf_url').value,
            demoUrl: document.getElementById('pf_demo').value,
            featured: document.getElementById('pf_featured').value === 'true',
            active: document.getElementById('pf_active').value === 'true',
            updatedAt: new Date()
        };
        try {
            if (id) { await updateDoc(doc(db, "portfolio", id), data); showToast('تم التحديث'); }
            else { data.createdAt = new Date(); await addDoc(collection(db, "portfolio"), data); showToast('تم الإضافة'); }
            modal.classList.remove('show'); loadData();
        } catch (e) { showToast(e.message, 'error'); }
    };
}

async function deleteHandler(id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        await deleteDoc(doc(db, "portfolio", id));
        showToast('تم الحذف');
        loadData();
    }
}
