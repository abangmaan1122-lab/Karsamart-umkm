/**
 * ============================================================================
 * KarsaMart (karsamart.id) — Database Layer (LocalStorage Schema & Seed Data)
 * Berisi definisi tabel users, products, transactions, dan operasi CRUD.
 * ============================================================================
 */

const DB_KEYS = {
  USERS: 'karsamart_users_v1',
  PRODUCTS: 'karsamart_products_v1',
  TRANSACTIONS: 'karsamart_transactions_v1',
  SESSION: 'karsamart_session_v1'
};

/**
 * Fungsi hash ringan untuk menyimulasikan penyimpanan password terenkripsi
 */
function hashPassword(rawPassword) {
  let hash = 5381;
  const salted = `KM_SALT_${rawPassword}`;
  for (let i = 0; i < salted.length; i++) {
    hash = (hash * 33) ^ salted.charCodeAt(i);
  }
  return `sha256_sim_${(hash >>> 0).toString(16)}`;
}

const SEED_USERS = [
  {
    id: 'USR-01',
    username: 'admin',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    fullName: 'Administrator Utama'
  },
  {
    id: 'USR-02',
    username: 'kasir',
    passwordHash: hashPassword('kasir123'),
    role: 'kasir',
    fullName: 'Kasir Toko 01'
  }
];

const SEED_PRODUCTS = [
  {
    id: 'PRD-001',
    sku: 'SMB-001',
    name: 'Beras Pandan Wangi 5kg',
    category: 'Sembako',
    price: 72000,
    stock: 18,
    description: 'Beras pulen alami pilihan petani lokal tanpa pemutih, kemasan 5 kg.'
  },
  {
    id: 'PRD-002',
    sku: 'SMB-002',
    name: 'Minyak Goreng Sawit 2L',
    category: 'Sembako',
    price: 34000,
    stock: 24,
    description: 'Minyak goreng jernih dua kali penyaringan, kemasan pouch 2 liter.'
  },
  {
    id: 'PRD-003',
    sku: 'SMB-003',
    name: 'Gula Pasir Kristal 1kg',
    category: 'Sembako',
    price: 17500,
    stock: 4,
    description: 'Gula tebu murni higienis untuk kebutuhan dapur dan minuman harian.'
  },
  {
    id: 'PRD-004',
    sku: 'MNM-001',
    name: 'Kopi Arabika Gayo 250g',
    category: 'Minuman',
    price: 55000,
    stock: 12,
    description: 'Biji kopi sangrai medium roast dengan aroma khas dataran tinggi Gayo.'
  },
  {
    id: 'PRD-005',
    sku: 'MNM-002',
    name: 'Teh Melati Tubruk 100g',
    category: 'Minuman',
    price: 12000,
    stock: 30,
    description: 'Daun teh hijau pilihan berpadu bunga melati asli yang harum.'
  },
  {
    id: 'PRD-006',
    sku: 'SNK-001',
    name: 'Keripik Singkong Balado 200g',
    category: 'Makanan Ringan',
    price: 15000,
    stock: 20,
    description: 'Keripik singkong renyah dengan bumbu balado pedas manis UMKM.'
  },
  {
    id: 'PRD-007',
    sku: 'SNK-002',
    name: 'Kacang Mete Panggang 150g',
    category: 'Makanan Ringan',
    price: 38000,
    stock: 3,
    description: 'Kacang mete pilihan dipanggang tanpa minyak, gurih dan renyah.'
  },
  {
    id: 'PRD-008',
    sku: 'RMH-001',
    name: 'Sabun Cuci Piring Jeruk Nipis 800ml',
    category: 'Kebutuhan Rumah',
    price: 14500,
    stock: 15,
    description: 'Formula konsentrat ekstrak jeruk nipis efektif mengangkat lemak membandel.'
  }
];

const SEED_TRANSACTIONS = [
  {
    invoiceNo: 'INV-20261126-001',
    createdAt: '2026-11-26 09:15',
    channel: 'POS Kasir',
    cashierName: 'Kasir Toko 01',
    customerName: 'Pelanggan Umum',
    paymentMethod: 'Tunai',
    subtotal: 106000,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: 106000,
    cashReceived: 110000,
    changeAmount: 4000,
    items: [
      { id: 'PRD-001', name: 'Beras Pandan Wangi 5kg', category: 'Sembako', price: 72000, qty: 1 },
      { id: 'PRD-002', name: 'Minyak Goreng Sawit 2L', category: 'Sembako', price: 34000, qty: 1 }
    ]
  },
  {
    invoiceNo: 'INV-20261126-002',
    createdAt: '2026-11-26 11:40',
    channel: 'Toko Online',
    cashierName: 'Sistem Web',
    customerName: 'Budi Santoso',
    paymentMethod: 'QRIS Online',
    subtotal: 70000,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: 70000,
    cashReceived: 70000,
    changeAmount: 0,
    items: [
      { id: 'PRD-004', name: 'Kopi Arabika Gayo 250g', category: 'Minuman', price: 55000, qty: 1 },
      { id: 'PRD-006', name: 'Keripik Singkong Balado 200g', category: 'Makanan Ringan', price: 15000, qty: 1 }
    ]
  }
];

const DatabaseService = {
  init() {
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem(DB_KEYS.PRODUCTS)) {
      localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
    }
    if (!localStorage.getItem(DB_KEYS.TRANSACTIONS)) {
      localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(SEED_TRANSACTIONS));
    }
  },

  getUsers() {
    return JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  },

  authenticate(username, password) {
    const users = this.getUsers();
    const targetHash = hashPassword(password);
    return users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.passwordHash === targetHash
    ) || null;
  },

  getProducts() {
    return JSON.parse(localStorage.getItem(DB_KEYS.PRODUCTS) || '[]');
  },

  saveProducts(products) {
    localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(products));
  },

  addProduct(productData) {
    const products = this.getProducts();
    const newProduct = {
      id: `PRD-${Date.now().toString().slice(-5)}`,
      ...productData
    };
    products.unshift(newProduct);
    this.saveProducts(products);
    return newProduct;
  },

  updateProduct(id, updatedData) {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...updatedData };
    this.saveProducts(products);
    return products[index];
  },

  deleteProduct(id) {
    const filtered = this.getProducts().filter((p) => p.id !== id);
    this.saveProducts(filtered);
  },

  deductStock(items) {
    const products = this.getProducts();
    items.forEach((item) => {
      const target = products.find((p) => p.id === item.id);
      if (target) {
        target.stock = Math.max(0, target.stock - item.qty);
      }
    });
    this.saveProducts(products);
  },

  getTransactions() {
    return JSON.parse(localStorage.getItem(DB_KEYS.TRANSACTIONS) || '[]');
  },

  addTransaction(txData) {
    const transactions = this.getTransactions();
    const sequence = String(transactions.length + 1).padStart(3, '0');
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const record = {
      invoiceNo: `INV-${datePart}-${sequence}`,
      ...txData
    };
    transactions.unshift(record);
    localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    this.deductStock(txData.items);
    return record;
  },

  exportJSON() {
    const payload = {
      application: 'KarsaMart (karsamart.id)',
      exportedAt: new Date().toISOString(),
      collections: {
        users: this.getUsers(),
        products: this.getProducts(),
        transactions: this.getTransactions()
      }
    };
    return JSON.stringify(payload, null, 2);
  },

  resetAll() {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
    localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(SEED_TRANSACTIONS));
  }
};