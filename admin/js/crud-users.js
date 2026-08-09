import { db } from "../../site/js/firebase-init.js";
import { collection, getDocs, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { showToast } from './admin-app.js';

let data = [];

export async function renderUsers(container) {
    container.innerHTML = `
        <div class="table-container">
            <div class="table-toolbar"><h3>إدارة العملاء</h3></div>
            <table><thead><tr><th>#</th><th>الاسم</th><th>البريد الإلكتروني</th><th>تاريخ التسجيل</th><th>الإجراءات</th></tr></thead>
            <tbody id="tbody"><tr><td colspan="5">جاري التحميل...</td></tr></tbody></table>
        </div>
    `;
    await loadData();
}

async function loadData() {
    const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
    data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tbody');
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="5">لا يوجد مستخدمون</td></tr>`; return; }
    tbody.innerHTML = data.map((item, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${item.displayName || 'غير معروف'}</td>
            <td>${item.email || '-'}</td>
            <td>${item.createdAt?.toDate?.().toLocaleDateString('ar-SA') || '-'}</td>
            <td>
                <button class="btn btn-danger-sm" onclick="window.deleteUser('${item.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    window.deleteUser = (id) => deleteHandler(id);
}

async function deleteHandler(id) {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        await deleteDoc(doc(db, "users", id));
        showToast('تم الحذف');
        loadData();
    }
}
