/**
 * ============================================================================
 * KarsaMart (karsamart.id) — Main Application Controller
 * Mengelola RBAC (Admin/Kasir), Toko Online, POS Kasir, CMS, dan Analitik.
 * ============================================================================
 */

/* ============================================================================
   1. SECURITY & FORMATTING UTILITIES
   ============================================================================ */
const SecurityUtils = {
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  },

  nowFormatted() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  getCategorySVG(category) {
    const colorMap = {
      Sembako: { bg: '#ecfdf5', stroke: '#059669' },
      Minuman: { bg: '#eff6ff', stroke: '#2563eb' },
      'Makanan Ringan': { bg: '#fffbeb', stroke: '#d97706' },
      'Kebutuhan Rumah': { bg: '#f5f3ff', stroke: '#7c3aed' }
    };
    const theme = colorMap[category] || { bg: '#f1f5f9', stroke: '#475569' };
    return `
      <div class="w-full h-32 rounded-xl flex items-center justify-center" style="background:${theme.bg}">
        <svg class="w-12 h-12" fill="none" stroke="${theme.stroke}" stroke-width="1.75" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    `;
  }
};

/* ============================================================================
   2. UI NOTIFICATION & CONFIRMATION DIALOG
   ============================================================================ */
const UIHelpers = {
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgClass = type === 'error' ? 'bg-rose-600' : type === 'warning' ? 'bg-amber-600' : 'bg-slate-900';
    toast.className = `${bgClass} text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg transition opacity-100`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  },

  showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const cleanup = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };

    document.getElementById('btn-confirm-cancel').onclick = cleanup;
    document.getElementById('btn-confirm-ok').onclick = () => {
      cleanup();
      onConfirm();
    };
  }
};

/* ============================================================================
   3. GLOBAL APPLICATION STATE
   ============================================================================ */
const AppState = {
  activeTab: 'store',
  storeCategory: 'Semua',
  storeSearch: '',
  posCategory: 'Semua',
  posSearch: '',
  cmsSearch: '',
  storeCart: [],
  posCart: [],
  posPaymentMethod: 'Tunai',
  dbInspectTable: 'products'
};

/* ============================================================================
   4. ROLE-BASED ACCESS CONTROL (RBAC) & NAVIGATION
   ============================================================================ */
const AuthController = {
  TAB_PERMISSIONS: {
    store: ['public', 'kasir', 'admin'],
    pos: ['kasir', 'admin'],
    dashboard: ['kasir', 'admin'],
    cms: ['admin'],
    database: ['admin']
  },

  getCurrentUser() {
    const raw = sessionStorage.getItem(DB_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  },

  getCurrentRole() {
    const user = this.getCurrentUser();
    return user ? user.role : 'public';
  },

  canAccess(tabName) {
    const allowed = this.TAB_PERMISSIONS[tabName] || [];
    return allowed.includes(this.getCurrentRole());
  },

  login(username, password) {
    const user = DatabaseService.authenticate(username, password);
    if (!user) {
      UIHelpers.showToast('Username atau password salah!', 'error');
      return false;
    }
    const sessionData = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName
    };
    sessionStorage.setItem(DB_KEYS.SESSION, JSON.stringify(sessionData));
    this.updateNavUI();
    UIHelpers.showToast(`Selamat datang, ${user.fullName}!`);
    return true;
  },

  logout() {
    sessionStorage.removeItem(DB_KEYS.SESSION);
    this.updateNavUI();
    this.switchTab('store');
    UIHelpers.showToast('Anda telah keluar dari sesi staff.');
  },

  updateNavUI() {
    const user = this.getCurrentUser();
    const badge = document.getElementById('role-badge');
    const authLabel = document.getElementById('btn-auth-label');

    if (user) {
      badge.textContent = `Role: ${user.role.toUpperCase()} (${user.username})`;
      badge.className = 'text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300';
      authLabel.textContent = 'Logout';
      document.getElementById('pos-cashier-info').textContent = `Kasir Aktif: ${user.fullName}`;
    } else {
      badge.textContent = 'Mode: Pembeli Publik';
      badge.className = 'text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200';
      authLabel.textContent = 'Login Staff';
    }

    // Perbarui ikon gembok pada tab
    document.querySelectorAll('[data-lock-for]').forEach((el) => {
      const targetTab = el.getAttribute('data-lock-for');
      el.style.display = this.canAccess(targetTab) ? 'none' : 'inline';
    });
  },

  switchTab(tabName) {
    if (!this.canAccess(tabName)) {
      UIHelpers.showToast('Akses ditolak! Silakan login sebagai Admin atau Kasir.', 'warning');
      openLoginModal();
      return;
    }

    AppState.activeTab = tabName;

    document.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.classList.toggle('active-tab', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.add('hidden');
    });
    document.getElementById(`view-${tabName}`).classList.remove('hidden');

    // Render modul yang aktif
    if (tabName === 'store') StoreController.render();
    if (tabName === 'pos') POSController.render();
    if (tabName === 'cms') CMSController.render();
    if (tabName === 'dashboard') DashboardController.render();
    if (tabName === 'database') DatabaseInspectorController.render();
  }
};

/* ============================================================================
   5. MODUL TOKO ONLINE & KERANJANG PEMBELI
   ============================================================================ */
const StoreController = {
  render() {
    const products = DatabaseService.getProducts();
    const categories = ['Semua', ...new Set(products.map((p) => p.category))];

    // Render kategori filter
    const catContainer = document.getElementById('store-categories');
    catContainer.innerHTML = categories
      .map(
        (cat) => `
        <button type="button" onclick="StoreController.setCategory('${SecurityUtils.escapeHTML(cat)}')"
          class="cat-pill ${AppState.storeCategory === cat ? 'active-pill' : ''}">
          ${SecurityUtils.escapeHTML(cat)}
        </button>
      `
      )
      .join('');

    // Filter produk
    const filtered = products.filter((p) => {
      const matchCat = AppState.storeCategory === 'Semua' || p.category === AppState.storeCategory;
      const q = AppState.storeSearch.toLowerCase();
      const matchQuery = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });

    const grid = document.getElementById('store-product-grid');
    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 text-sm">Produk tidak ditemukan.</div>`;
      return;
    }

    grid.innerHTML = filtered
      .map((p) => {
        const outOfStock = p.stock <= 0;
        return `
          <article class="product-card bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
            <div class="space-y-3">
              ${SecurityUtils.getCategorySVG(p.category)}
              <div class="flex items-center justify-between text-[11px]">
                <span class="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">${SecurityUtils.escapeHTML(p.category)}</span>
                <span class="${outOfStock ? 'text-rose-600 font-bold' : 'text-slate-500'}">
                  ${outOfStock ? 'Stok Habis' : `Stok: ${p.stock}`}
                </span>
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-sm leading-snug">${SecurityUtils.escapeHTML(p.name)}</h3>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2">${SecurityUtils.escapeHTML(p.description)}</p>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span class="font-extrabold text-emerald-700 text-sm">${SecurityUtils.formatRupiah(p.price)}</span>
              <button type="button" ${outOfStock ? 'disabled' : ''}
                onclick="StoreController.addToCart('${p.id}')"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  outOfStock
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }">
                + Keranjang
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  },

  setCategory(cat) {
    AppState.storeCategory = cat;
    this.render();
  },

  addToCart(productId) {
    const product = DatabaseService.getProducts().find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existing = AppState.storeCart.find((item) => item.id === productId);
    if (existing) {
      if (existing.qty >= product.stock) {
        UIHelpers.showToast('Jumlah mencapai batas stok tersedia.', 'warning');
        return;
      }
      existing.qty += 1;
    } else {
      AppState.storeCart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        qty: 1
      });
    }

    this.renderCart();
    UIHelpers.showToast(`"${product.name}" ditambahkan ke keranjang.`);
  },

  updateCartQty(productId, delta) {
    const product = DatabaseService.getProducts().find((p) => p.id === productId);
    const index = AppState.storeCart.findIndex((i) => i.id === productId);
    if (index === -1) return;

    const nextQty = AppState.storeCart[index].qty + delta;
    if (nextQty <= 0) {
      AppState.storeCart.splice(index, 1);
    } else if (product && nextQty <= product.stock) {
      AppState.storeCart[index].qty = nextQty;
    } else {
      UIHelpers.showToast('Stok gudang tidak mencukupi.', 'warning');
    }
    this.renderCart();
  },

  renderCart() {
    const totalCount = AppState.storeCart.reduce((acc, item) => acc + item.qty, 0);
    document.getElementById('cart-badge-count').textContent = totalCount;

    const container = document.getElementById('store-cart-items');
    if (AppState.storeCart.length === 0) {
      container.innerHTML = `<p class="text-center text-sm text-slate-400 py-12">Keranjang belanja masih kosong.</p>`;
      document.getElementById('store-cart-total').textContent = 'Rp 0';
      return;
    }

    let grandTotal = 0;
    container.innerHTML = AppState.storeCart
      .map((item) => {
        const lineTotal = item.price * item.qty;
        grandTotal += lineTotal;
        return `
          <div class="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-xs text-slate-900 truncate">${SecurityUtils.escapeHTML(item.name)}</p>
              <p class="text-xs text-emerald-700 font-medium">${SecurityUtils.formatRupiah(lineTotal)}</p>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="StoreController.updateCartQty('${item.id}', -1)" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold">-</button>
              <span class="text-xs font-semibold w-5 text-center">${item.qty}</span>
              <button type="button" onclick="StoreController.updateCartQty('${item.id}', 1)" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold">+</button>
            </div>
          </div>
        `;
      })
      .join('');

    document.getElementById('store-cart-total').textContent = SecurityUtils.formatRupiah(grandTotal);
  },

  checkoutOnline() {
    if (AppState.storeCart.length === 0) {
      UIHelpers.showToast('Keranjang masih kosong!', 'warning');
      return;
    }
    const customerName = document.getElementById('customer-name').value.trim() || 'Pelanggan Online';
    const subtotal = AppState.storeCart.reduce((sum, i) => sum + i.price * i.qty, 0);

    const tx = DatabaseService.addTransaction({
      createdAt: SecurityUtils.nowFormatted(),
      channel: 'Toko Online',
      cashierName: 'Sistem Web',
      customerName,
      paymentMethod: 'QRIS / VA Online',
      subtotal,
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: subtotal,
      cashReceived: subtotal,
      changeAmount: 0,
      items: [...AppState.storeCart]
    });

    AppState.storeCart = [];
    this.renderCart();
    this.render();
    closeCartDrawer();
    DashboardController.openReceiptModal(tx.invoiceNo);
    UIHelpers.showToast('Pesanan online berhasil diproses!');
  },

  checkoutWhatsApp() {
    if (AppState.storeCart.length === 0) {
      UIHelpers.showToast('Keranjang masih kosong!', 'warning');
      return;
    }
    const name = document.getElementById('customer-name').value.trim() || 'Pelanggan';
    const note = document.getElementById('customer-note').value.trim() || '-';
    let total = 0;

    const lines = AppState.storeCart.map((item, idx) => {
      const sub = item.price * item.qty;
      total += sub;
      return `${idx + 1}. ${item.name} (${item.qty}x) = ${SecurityUtils.formatRupiah(sub)}`;
    });

    const message = [
      `Halo Admin *KarsaMart (karsamart.id)*, saya ingin memesan:`,
      ``,
      ...lines,
      ``,
      `*Total Belanja:* ${SecurityUtils.formatRupiah(total)}`,
      `*Nama Pemesan:* ${name}`,
      `*Catatan/Alamat:* ${note}`
    ].join('\n');

    const waUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
};

/* ============================================================================
   6. MODUL TERMINAL KASIR (POINT OF SALE)
   ============================================================================ */
const POSController = {
  render() {
    const products = DatabaseService.getProducts();
    const categories = ['Semua', ...new Set(products.map((p) => p.category))];

    document.getElementById('pos-categories').innerHTML = categories
      .map(
        (cat) => `
        <button type="button" onclick="POSController.setCategory('${SecurityUtils.escapeHTML(cat)}')"
          class="cat-pill ${AppState.posCategory === cat ? 'active-pill' : ''}">
          ${SecurityUtils.escapeHTML(cat)}
        </button>
      `
      )
      .join('');

    const filtered = products.filter((p) => {
      const matchCat = AppState.posCategory === 'Semua' || p.category === AppState.posCategory;
      const q = AppState.posSearch.toLowerCase();
      return matchCat && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    });

    document.getElementById('pos-product-grid').innerHTML = filtered
      .map((p) => {
        const disabled = p.stock <= 0;
        return `
          <button type="button" ${disabled ? 'disabled' : ''} onclick="POSController.addToCart('${p.id}')"
            class="text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
              disabled
                ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-xs'
            }">
            <div class="min-w-0">
              <span class="text-[11px] font-mono text-slate-400">${SecurityUtils.escapeHTML(p.sku)}</span>
              <p class="font-semibold text-sm text-slate-900 truncate">${SecurityUtils.escapeHTML(p.name)}</p>
              <p class="text-xs font-bold text-emerald-700 mt-0.5">${SecurityUtils.formatRupiah(p.price)}</p>
            </div>
            <span class="text-xs font-semibold px-2 py-1 rounded-md ${
              p.stock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
            }">
              Stok: ${p.stock}
            </span>
          </button>
        `;
      })
      .join('');

    this.renderCart();
  },

  setCategory(cat) {
    AppState.posCategory = cat;
    this.render();
  },

  addToCart(productId) {
    const product = DatabaseService.getProducts().find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existing = AppState.posCart.find((i) => i.id === productId);
    if (existing) {
      if (existing.qty >= product.stock) {
        UIHelpers.showToast('Stok barang tidak mencukupi!', 'warning');
        return;
      }
      existing.qty += 1;
    } else {
      AppState.posCart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        qty: 1
      });
    }
    this.renderCart();
  },

  updateQty(productId, delta) {
    const product = DatabaseService.getProducts().find((p) => p.id === productId);
    const idx = AppState.posCart.findIndex((i) => i.id === productId);
    if (idx === -1) return;

    const next = AppState.posCart[idx].qty + delta;
    if (next <= 0) {
      AppState.posCart.splice(idx, 1);
    } else if (product && next <= product.stock) {
      AppState.posCart[idx].qty = next;
    } else {
      UIHelpers.showToast('Stok maksimal tercapai.', 'warning');
    }
    this.renderCart();
  },

  clearCart() {
    AppState.posCart = [];
    document.getElementById('pos-discount').value = 0;
    document.getElementById('pos-cash-received').value = '';
    this.renderCart();
  },

  setPaymentMethod(method) {
    AppState.posPaymentMethod = method;
    document.querySelectorAll('.pay-method-btn').forEach((btn) => {
      btn.classList.toggle('active-pay', btn.getAttribute('data-method') === method);
    });
    const cashBox = document.getElementById('pos-cash-box');
    cashBox.style.display = method === 'Tunai' ? 'block' : 'none';
    this.recalculate();
  },

  renderCart() {
    const container = document.getElementById('pos-cart-items');
    if (AppState.posCart.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">Belum ada item dipilih.</p>`;
    } else {
      container.innerHTML = AppState.posCart
        .map(
          (item) => `
          <div class="flex items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-slate-900 truncate">${SecurityUtils.escapeHTML(item.name)}</p>
              <p class="text-slate-500">${SecurityUtils.formatRupiah(item.price)} x ${item.qty}</p>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" onclick="POSController.updateQty('${item.id}', -1)" class="w-6 h-6 rounded bg-white border border-slate-300 font-bold">-</button>
              <span class="w-5 text-center font-semibold">${item.qty}</span>
              <button type="button" onclick="POSController.updateQty('${item.id}', 1)" class="w-6 h-6 rounded bg-white border border-slate-300 font-bold">+</button>
            </div>
          </div>
        `
        )
        .join('');
    }
    this.recalculate();
  },

  recalculate() {
    const subtotal = AppState.posCart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discountPercent = Math.min(100, Math.max(0, Number(document.getElementById('pos-discount').value) || 0));
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const afterDiscount = subtotal - discountAmount;

    const useTax = document.getElementById('pos-tax-toggle').checked;
    const taxAmount = useTax ? Math.round(afterDiscount * 0.11) : 0;
    const grandTotal = afterDiscount + taxAmount;

    document.getElementById('pos-subtotal').textContent = SecurityUtils.formatRupiah(subtotal);
    document.getElementById('pos-discount-amount').textContent = `- ${SecurityUtils.formatRupiah(discountAmount)}`;
    document.getElementById('pos-tax-amount').textContent = SecurityUtils.formatRupiah(taxAmount);
    document.getElementById('pos-grand-total').textContent = SecurityUtils.formatRupiah(grandTotal);

    const cashReceived = Number(document.getElementById('pos-cash-received').value) || 0;
    const change = Math.max(0, cashReceived - grandTotal);
    document.getElementById('pos-change-display').textContent = SecurityUtils.formatRupiah(change);

    return { subtotal, discountPercent, discountAmount, taxAmount, grandTotal, cashReceived, change };
  },

  processCheckout() {
    if (AppState.posCart.length === 0) {
      UIHelpers.showToast('Pilih minimal 1 barang untuk transaksi!', 'warning');
      return;
    }

    const calc = this.recalculate();
    if (AppState.posPaymentMethod === 'Tunai' && calc.cashReceived < calc.grandTotal) {
      UIHelpers.showToast('Nominal uang tunai kurang dari total tagihan!', 'error');
      return;
    }

    const user = AuthController.getCurrentUser();
    const tx = DatabaseService.addTransaction({
      createdAt: SecurityUtils.nowFormatted(),
      channel: 'POS Kasir',
      cashierName: user ? user.fullName : 'Kasir',
      customerName: 'Pelanggan Walk-In',
      paymentMethod: AppState.posPaymentMethod,
      subtotal: calc.subtotal,
      discountPercent: calc.discountPercent,
      discountAmount: calc.discountAmount,
      taxAmount: calc.taxAmount,
      grandTotal: calc.grandTotal,
      cashReceived: AppState.posPaymentMethod === 'Tunai' ? calc.cashReceived : calc.grandTotal,
      changeAmount: AppState.posPaymentMethod === 'Tunai' ? calc.change : 0,
      items: [...AppState.posCart]
    });

    this.clearCart();
    this.render();
    DashboardController.openReceiptModal(tx.invoiceNo);
    UIHelpers.showToast(`Transaksi ${tx.invoiceNo} berhasil disimpan!`);
  }
};

/* ============================================================================
   7. MODUL MINI-CMS PRODUK & STOK (KHUSUS ADMIN)
   ============================================================================ */
const CMSController = {
  render() {
    const products = DatabaseService.getProducts().filter((p) => {
      const q = AppState.cmsSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });

    const tbody = document.getElementById('cms-table-body');
    tbody.innerHTML = products
      .map(
        (p) => `
        <tr class="hover:bg-slate-50">
          <td class="px-4 py-3 font-mono text-xs text-slate-600">${SecurityUtils.escapeHTML(p.sku)}</td>
          <td class="px-4 py-3 font-semibold text-slate-900">${SecurityUtils.escapeHTML(p.name)}</td>
          <td class="px-4 py-3 text-xs text-slate-600">${SecurityUtils.escapeHTML(p.category)}</td>
          <td class="px-4 py-3 text-right font-medium">${SecurityUtils.formatRupiah(p.price)}</td>
          <td class="px-4 py-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-bold ${
              p.stock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
            }">
              ${p.stock}
            </span>
          </td>
          <td class="px-4 py-3 text-right space-x-2">
            <button type="button" onclick="CMSController.editProduct('${p.id}')" class="text-xs font-semibold text-blue-600 hover:underline">Edit</button>
            <button type="button" onclick="CMSController.deleteProduct('${p.id}')" class="text-xs font-semibold text-rose-600 hover:underline">Hapus</button>
          </td>
        </tr>
      `
      )
      .join('');
  },

  handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('cms-product-id').value;
    const payload = {
      sku: document.getElementById('cms-sku').value.trim().toUpperCase(),
      name: document.getElementById('cms-name').value.trim(),
      category: document.getElementById('cms-category').value,
      stock: Math.max(0, parseInt(document.getElementById('cms-stock').value, 10) || 0),
      price: Math.max(100, parseInt(document.getElementById('cms-price').value, 10) || 0),
      description: document.getElementById('cms-description').value.trim()
    };

    if (id) {
      DatabaseService.updateProduct(id, payload);
      UIHelpers.showToast('Data produk berhasil diperbarui.');
    } else {
      DatabaseService.addProduct(payload);
      UIHelpers.showToast('Produk baru berhasil ditambahkan ke katalog.');
    }

    this.resetForm();
    this.render();
  },

  editProduct(id) {
    const product = DatabaseService.getProducts().find((p) => p.id === id);
    if (!product) return;

    document.getElementById('cms-form-title').textContent = `Edit Produk (${product.sku})`;
    document.getElementById('cms-product-id').value = product.id;
    document.getElementById('cms-sku').value = product.sku;
    document.getElementById('cms-name').value = product.name;
    document.getElementById('cms-category').value = product.category;
    document.getElementById('cms-stock').value = product.stock;
    document.getElementById('cms-price').value = product.price;
    document.getElementById('cms-description').value = product.description;
  },

  resetForm() {
    document.getElementById('cms-form').reset();
    document.getElementById('cms-product-id').value = '';
    document.getElementById('cms-form-title').textContent = 'Tambah Produk Baru';
  },

  deleteProduct(id) {
    UIHelpers.showConfirm('Hapus Produk', 'Yakin ingin menghapus produk ini dari katalog dan inventaris?', () => {
      DatabaseService.deleteProduct(id);
      this.render();
      UIHelpers.showToast('Produk telah dihapus.');
    });
  }
};

/* ============================================================================
   8. MODUL DASHBOARD ANALITIK & CETAK STRUK
   ============================================================================ */
const DashboardController = {
  render() {
    const products = DatabaseService.getProducts();
    const transactions = DatabaseService.getTransactions();

    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.grandTotal, 0);
    const lowStockCount = products.filter((p) => p.stock < 5).length;

    document.getElementById('kpi-revenue').textContent = SecurityUtils.formatRupiah(totalRevenue);
    document.getElementById('kpi-tx-count').textContent = `${transactions.length} Faktur`;
    document.getElementById('kpi-sku-count').textContent = `${products.length} SKU`;
    document.getElementById('kpi-low-stock').textContent = `${lowStockCount} Item`;

    // Hitung omzet per kategori
    const categoryTotals = {};
    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const cat = item.category || 'Lainnya';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + item.price * item.qty;
      });
    });

    const maxVal = Math.max(1, ...Object.values(categoryTotals));
    const chartBox = document.getElementById('category-chart-container');
    const entries = Object.entries(categoryTotals);

    chartBox.innerHTML =
      entries.length === 0
        ? `<p class="text-xs text-slate-400">Belum ada data penjualan.</p>`
        : entries
            .map(([cat, val]) => {
              const pct = Math.round((val / maxVal) * 100);
              return `
                <div class="space-y-1">
                  <div class="flex justify-between text-xs font-medium">
                    <span class="text-slate-700">${SecurityUtils.escapeHTML(cat)}</span>
                    <span class="font-bold text-slate-900">${SecurityUtils.formatRupiah(val)}</span>
                  </div>
                  <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-600 rounded-full" style="width:${pct}%"></div>
                  </div>
                </div>
              `;
            })
            .join('');

    // Render tabel riwayat transaksi
    document.getElementById('tx-table-body').innerHTML = transactions
      .map(
        (tx) => `
        <tr class="hover:bg-slate-50">
          <td class="px-4 py-3 font-mono text-xs font-semibold text-slate-900">${SecurityUtils.escapeHTML(tx.invoiceNo)}</td>
          <td class="px-4 py-3 text-xs text-slate-500">${SecurityUtils.escapeHTML(tx.createdAt)}</td>
          <td class="px-4 py-3 text-xs text-slate-700">${SecurityUtils.escapeHTML(tx.cashierName)}</td>
          <td class="px-4 py-3 text-xs"><span class="px-2 py-0.5 rounded bg-slate-100">${SecurityUtils.escapeHTML(tx.paymentMethod)}</span></td>
          <td class="px-4 py-3 text-right font-bold text-emerald-700">${SecurityUtils.formatRupiah(tx.grandTotal)}</td>
          <td class="px-4 py-3 text-right">
            <button type="button" onclick="DashboardController.openReceiptModal('${tx.invoiceNo}')" class="text-xs font-semibold text-blue-600 hover:underline">
              Struk
            </button>
          </td>
        </tr>
      `
      )
      .join('');
  },

  openReceiptModal(invoiceNo) {
    const tx = DatabaseService.getTransactions().find((t) => t.invoiceNo === invoiceNo);
    if (!tx) return;

    document.getElementById('receipt-meta').innerHTML = `
      <div>No. Faktur : <strong>${SecurityUtils.escapeHTML(tx.invoiceNo)}</strong></div>
      <div>Waktu      : ${SecurityUtils.escapeHTML(tx.createdAt)}</div>
      <div>Kasir      : ${SecurityUtils.escapeHTML(tx.cashierName)}</div>
      <div>Metode     : ${SecurityUtils.escapeHTML(tx.paymentMethod)}</div>
    `;

    document.getElementById('receipt-items').innerHTML = tx.items
      .map(
        (item) => `
        <div class="flex justify-between">
          <span>${SecurityUtils.escapeHTML(item.name)} x${item.qty}</span>
          <span>${SecurityUtils.formatRupiah(item.price * item.qty)}</span>
        </div>
      `
      )
      .join('');

    document.getElementById('receipt-totals').innerHTML = `
      <div class="flex justify-between"><span>Subtotal</span><span>${SecurityUtils.formatRupiah(tx.subtotal)}</span></div>
      <div class="flex justify-between"><span>Diskon</span><span>-${SecurityUtils.formatRupiah(tx.discountAmount)}</span></div>
      <div class="flex justify-between"><span>PPN 11%</span><span>${SecurityUtils.formatRupiah(tx.taxAmount)}</span></div>
      <div class="flex justify-between font-bold text-xs pt-1"><span>TOTAL</span><span>${SecurityUtils.formatRupiah(tx.grandTotal)}</span></div>
      <div class="flex justify-between"><span>Dibayar</span><span>${SecurityUtils.formatRupiah(tx.cashReceived)}</span></div>
      <div class="flex justify-between"><span>Kembalian</span><span>${SecurityUtils.formatRupiah(tx.changeAmount)}</span></div>
    `;

    const modal = document.getElementById('receipt-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

/* ============================================================================
   9. MODUL INSPEKTOR DATABASE & BACKUP JSON
   ============================================================================ */
const DatabaseInspectorController = {
  render() {
    document.querySelectorAll('.db-tab').forEach((btn) => {
      btn.classList.toggle('active-db-tab', btn.getAttribute('data-db-table') === AppState.dbInspectTable);
    });

    let data = [];
    if (AppState.dbInspectTable === 'products') data = DatabaseService.getProducts();
    if (AppState.dbInspectTable === 'transactions') data = DatabaseService.getTransactions();
    if (AppState.dbInspectTable === 'users') data = DatabaseService.getUsers();

    document.getElementById('db-json-viewer').textContent = JSON.stringify(data, null, 2);
  },

  downloadBackup() {
    const jsonStr = DatabaseService.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karsamart-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UIHelpers.showToast('File backup database (.json) berhasil diunduh.');
  },

  resetDatabase() {
    UIHelpers.showConfirm(
      'Reset Database Awal',
      'Semua transaksi baru dan perubahan produk akan dikembalikan ke data awal. Lanjutkan?',
      () => {
        DatabaseService.resetAll();
        this.render();
        UIHelpers.showToast('Database berhasil dikembalikan ke kondisi awal.');
      }
    );
  }
};

/* ============================================================================
   10. MODAL & DRAWER HELPERS + EVENT LISTENERS BOOTSTRAP
   ============================================================================ */
function openCartDrawer() {
  document.getElementById('cart-drawer').classList.remove('hidden');
}

function closeCartDrawer() {
  document.getElementById('cart-drawer').classList.add('hidden');
}

function openLoginModal() {
  const modal = document.getElementById('login-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inisialisasi Database & UI Awal
  DatabaseService.init();
  AuthController.updateNavUI();
  StoreController.render();
  StoreController.renderCart();

  // 2. Navigasi Tab Utama
  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      AuthController.switchTab(btn.getAttribute('data-tab'));
    });
  });

  // 3. Autentikasi Staff
  document.getElementById('btn-auth-action').addEventListener('click', () => {
    if (AuthController.getCurrentUser()) {
      AuthController.logout();
    } else {
      openLoginModal();
    }
  });

  document.getElementById('btn-close-login').addEventListener('click', closeLoginModal);

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    if (AuthController.login(u, p)) {
      closeLoginModal();
      e.target.reset();
    }
  });

  document.querySelectorAll('.demo-fill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('login-username').value = btn.getAttribute('data-demo-user');
      document.getElementById('login-password').value = btn.getAttribute('data-demo-pass');
    });
  });

  // 4. Keranjang Toko Online
  document.getElementById('btn-open-cart').addEventListener('click', openCartDrawer);
  document.getElementById('btn-close-cart').addEventListener('click', closeCartDrawer);
  document.getElementById('cart-backdrop').addEventListener('click', closeCartDrawer);
  document.getElementById('btn-checkout-online').addEventListener('click', () => StoreController.checkoutOnline());
  document.getElementById('btn-checkout-wa').addEventListener('click', () => StoreController.checkoutWhatsApp());

  document.getElementById('store-search').addEventListener('input', (e) => {
    AppState.storeSearch = e.target.value;
    StoreController.render();
  });

  // 5. Kasir POS
  document.getElementById('pos-search').addEventListener('input', (e) => {
    AppState.posSearch = e.target.value;
    POSController.render();
  });
  document.getElementById('btn-pos-clear').addEventListener('click', () => POSController.clearCart());
  document.getElementById('pos-discount').addEventListener('input', () => POSController.recalculate());
  document.getElementById('pos-tax-toggle').addEventListener('change', () => POSController.recalculate());
  document.getElementById('pos-cash-received').addEventListener('input', () => POSController.recalculate());
  document.getElementById('btn-pos-checkout').addEventListener('click', () => POSController.processCheckout());

  document.querySelectorAll('.pay-method-btn').forEach((btn) => {
    btn.addEventListener('click', () => POSController.setPaymentMethod(btn.getAttribute('data-method')));
  });

  // 6. CMS Produk
  document.getElementById('cms-form').addEventListener('submit', (e) => CMSController.handleFormSubmit(e));
  document.getElementById('btn-cms-reset').addEventListener('click', () => CMSController.resetForm());
  document.getElementById('cms-search').addEventListener('input', (e) => {
    AppState.cmsSearch = e.target.value;
    CMSController.render();
  });

  // 7. Struk Print & Close
  document.getElementById('btn-print-receipt').addEventListener('click', () => window.print());
  document.getElementById('btn-close-receipt').addEventListener('click', () => {
    const modal = document.getElementById('receipt-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  // 8. Inspektor Database
  document.querySelectorAll('.db-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      AppState.dbInspectTable = btn.getAttribute('data-db-table');
      DatabaseInspectorController.render();
    });
  });
  document.getElementById('btn-export-db').addEventListener('click', () => DatabaseInspectorController.downloadBackup());
  document.getElementById('btn-reset-db').addEventListener('click', () => DatabaseInspectorController.resetDatabase());
});