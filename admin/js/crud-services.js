import { db } from "../../site/js/firebase-init.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { showToast } from './admin-app.js';

let servicesData = [];

export async function renderServices(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-toolbar">
                <h3>إدارة الخدمات</h3>
                <button class="btn btn-primary-sm" id="addServiceBtn"><i class="fas fa-plus"></i> إضافة خدمة</button>
            </div>
            <div style="overflow-x:auto;">
                <table>
                    <thead><tr><th>#</th><th>العنوان</th><th>السعر</th><th>الحالة</th><th>مميز</th><th>الإجراءات</th></tr></thead>
                    <tbody id="servicesTableBody"><tr><td colspan="6" style="text-align:center;">جاري التحميل...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
    await loadServices();
    document.getElementById('addServiceBtn')?.addEventListener('click', () => openServiceForm());
}

async function loadServices() {
    const tbody = document.getElementById('servicesTableBody');
    try {
        const q = query(collection(db, "services"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        servicesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (servicesData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">لا توجد خدمات</td></tr>`;
            return;
        }

        tbody.innerHTML = servicesData.map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${s.title}</strong></td>
                <td>${s.price || 0} ${s.currency || 'SAR'}</td>
                <td><span class="badge-status ${s.active ? 'active' : 'inactive'}">${s.active ? 'منشور' : 'غير منشور'}</span></td>
                <td>${s.featured ? '⭐' : '-'}</td>
                <td>
                    <button class="btn btn-warning-sm" onclick="window.editService('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger-sm" onclick="window.deleteService('${s.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        window.editService = (id) => openServiceForm(id);
        window.deleteService = (id) => deleteServiceHandler(id);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">حدث خطأ</td></tr>`;
    }
}

function openServiceForm(id = null) {
    const isEdit = !!id;
    const item = isEdit ? servicesData.find(s => s.id === id) : null;

    const modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = isEdit ? 'تعديل الخدمة' : 'إضافة خدمة جديدة';
    document.getElementById('modalBody').innerHTML = `
        <form id="serviceForm">
            <div class="form-row">
                <div class="form-group"><label>العنوان (عربي)</label><input type="text" id="s_title" value="${item?.title || ''}" required /></div>
                <div class="form-group"><label>العنوان (إنجليزي)</label><input type="text" id="s_title_en" value="${item?.title_en || ''}" /></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>السعر</label><input type="number" id="s_price" value="${item?.price || 0}" /></div>
                <div class="form-group"><label>العملة</label><input type="text" id="s_currency" value="${item?.currency || 'SAR'}" /></div>
            </div>
            <div class="form-group"><label>الوصف (عربي)</label><textarea id="s_desc" rows="3">${item?.description || ''}</textarea></div>
            <div class="form-group"><label>الوصف (إنجليزي)</label><textarea id="s_desc_en" rows="3">${item?.description_en || ''}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label>مميز</label><select id="s_featured"><option value="true" ${item?.featured ? 'selected' : ''}>نعم</option><option value="false" ${!item?.featured ? 'selected' : ''}>لا</option></select></div>
                <div class="form-group"><label>منشور</label><select id="s_active"><option value="true" ${item?.active !== false ? 'selected' : ''}>نعم</option><option value="false" ${item?.active === false ? 'selected' : ''}>لا</option></select></div>
            </div>
            <input type="hidden" id="s_id" value="${id || ''}" />
        </form>
    `;
    modal.classList.add('show');

    document.getElementById('modalConfirm').textContent = isEdit ? 'تحديث' : 'إضافة';
    document.getElementById('modalConfirm').onclick = async () => {
        const data = {
            title: document.getElementById('s_title').value,
            title_en: document.getElementById('s_title_en').value,
            price: parseFloat(document.getElementById('s_price').value) || 0,
            currency: document.getElementById('s_currency').value || 'SAR',
            description: document.getElementById('s_desc').value,
            description_en: document.getElementById('s_desc_en').value,
            featured: document.getElementById('s_featured').value === 'true',
            active: document.getElementById('s_active').value === 'true',
            updatedAt: new Date()
        };

        try {
            if (isEdit) {
                await updateDoc(doc(db, "services", id), data);
                showToast('تم تحديث الخدمة بنجاح', 'success');
            } else {
                data.createdAt = new Date();
                await addDoc(collection(db, "services"), data);
                showToast('تم إضافة الخدمة بنجاح', 'success');
            }
            modal.classList.remove('show');
            loadServices();
        } catch (e) {
            showToast('حدث خطأ: ' + e.message, 'error');
        }
    };
}

function deleteServiceHandler(id) {
    const modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = 'تأكيد الحذف';
    document.getElementById('modalBody').innerHTML = `<p>هل أنت متأكد من حذف هذه الخدمة؟<br><span style="color:red;font-weight:bold;">لا يمكن التراجع عن هذا الإجراء.</span></p>`;
    document.getElementById('modalConfirm').textContent = 'حذف';
    document.getElementById('modalConfirm').onclick = async () => {
        try {
            await deleteDoc(doc(db, "services", id));
            showToast('تم حذف الخدمة بنجاح', 'success');
            modal.classList.remove('show');
            loadServices();
        } catch (e) {
            showToast('حدث خطأ: ' + e.message, 'error');
        }
    };
    modal.classList.add('show');
}

// إغلاق المودال
document.getElementById('modalClose')?.addEventListener('click', () => document.getElementById('modalOverlay').classList.remove('show'));
document.getElementById('modalCancel')?.addEventListener('click', () => document.getElementById('modalOverlay').classList.remove('show'));
document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('modalOverlay').classList.remove('show');
});
