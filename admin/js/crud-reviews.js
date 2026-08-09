import { db } from "../../site/js/firebase-init.js";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { showToast } from './admin-app.js';

let data = [];

export async function renderReviews(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-toolbar">
                <h3>إدارة التقييمات</h3>
                <div>
                    <select id="statusFilter" style="padding:0.3rem 1rem;border-radius:var(--radius);border:1px solid var(--gray-200);">
                        <option value="all">الكل</option>
                        <option value="pending">معلقة</option>
                        <option value="approved">مقبولة</option>
                        <option value="rejected">مرفوضة</option>
                    </select>
                </div>
            </div>
            <table><thead><tr><th>#</th><th>المستخدم</th><th>التقييم</th><th>الحالة</th><th>التاريخ</th><th>الإجراءات</th></tr></thead>
            <tbody id="tbody"><tr><td colspan="6">جاري التحميل...</td></tr></tbody></table>
        </div>
    `;
    await loadData();
    document.getElementById('statusFilter')?.addEventListener('change', loadData);
}

async function loadData() {
    const filter = document.getElementById('statusFilter')?.value || 'all';
    let q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    if (filter !== 'all') q = query(collection(db, "reviews"), where("status", "==", filter), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tbody');
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="6">لا توجد تقييمات</td></tr>`; return; }
    tbody.innerHTML = data.map((item, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${item.user || 'مجهول'}</td>
            <td>${'★'.repeat(item.rating || 0)}</td>
            <td><span class="badge-status ${item.status === 'approved' ? 'active' : 'inactive'}">${item.status === 'approved' ? 'مقبولة' : item.status === 'pending' ? 'معلقة' : 'مرفوضة'}</span></td>
            <td>${item.createdAt?.toDate?.().toLocaleDateString('ar-SA') || '-'}</td>
            <td>
                <button class="btn btn-primary-sm" onclick="window.approve('${item.id}')"><i class="fas fa-check"></i></button>
                <button class="btn btn-danger-sm" onclick="window.reject('${item.id}')"><i class="fas fa-times"></i></button>
                <button class="btn btn-danger-sm" onclick="window.deleteReview('${item.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    window.approve = (id) => updateStatus(id, 'approved');
    window.reject = (id) => updateStatus(id, 'rejected');
    window.deleteReview = (id) => deleteHandler(id);
}

async function updateStatus(id, status) {
    try {
        await updateDoc(doc(db, "reviews", id), { status, updatedAt: new Date() });
        showToast(`تم ${status === 'approved' ? 'قبول' : 'رفض'} التقييم`, 'success');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteHandler(id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        await deleteDoc(doc(db, "reviews", id));
        showToast('تم الحذف');
        loadData();
    }
}
