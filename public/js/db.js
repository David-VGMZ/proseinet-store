const DB_NAME = 'ProseinetOffline';
const DB_VERSION = 1;
const STORE_PRODUCTOS = 'productos';
const STORE_CARRITO = 'carrito';
const STORE_PEDIDOS = 'pedidos';
const STORE_USUARIOS = 'usuarios';

let db = null;

// Inicializar la base de datos
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Error abriendo IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB inicializada correctamente');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('Actualizando estructura de IndexedDB...');

            // Store de Productos
            if (!db.objectStoreNames.contains(STORE_PRODUCTOS)) {
                const productosStore = db.createObjectStore(STORE_PRODUCTOS, { keyPath: 'id' });
                productosStore.createIndex('categoria', 'categoria', { unique: false });
                productosStore.createIndex('nombre', 'nombre', { unique: false });
                productosStore.createIndex('serie', 'serie', { unique: false });
                productosStore.createIndex('estadoProducto', 'estadoProducto', { unique: false });
                productosStore.createIndex('modProducto', 'modProducto', { unique: false });
                productosStore.createIndex('procesador', 'procesador', { unique: false });
                productosStore.createIndex('memoriaRam', 'memoriaRam', { unique: false });
                productosStore.createIndex('storage', 'storage', { unique: false });
                productosStore.createIndex('vram', 'vram', { unique: false });
                productosStore.createIndex('ddrRam', 'ddrRam', { unique: false });
                productosStore.createIndex('gddr', 'gddr', { unique: false });
                console.log('Store "productos" creado');
            }

            // Store de Usuarios
            if (!db.objectStoreNames.contains(STORE_USUARIOS)) {
                const productosStore = db.createObjectStore(STORE_USUARIOS, { keyPath: 'id' });
                productosStore.createIndex('email', 'email', { unique: false });
                productosStore.createIndex('fechaCreacion', 'fechaCreacion', { unique: false });
                productosStore.createIndex('rol', 'rol', { unique: false });
                console.log('Store "usuarios" creado');
            }

            // Store de Carrito
            if (!db.objectStoreNames.contains(STORE_CARRITO)) {
                db.createObjectStore(STORE_CARRITO, { keyPath: 'id' });
                console.log('Store "carrito" creado');
            }

            // Store de Pedidos (para sincronizar cuando vuelva online)
            if (!db.objectStoreNames.contains(STORE_PEDIDOS)) {
                const pedidosStore = db.createObjectStore(STORE_PEDIDOS, { keyPath: 'id', autoIncrement: true });
                pedidosStore.createIndex('sincronizado', 'sincronizado', { unique: false });
                pedidosStore.createIndex('fecha', 'fecha', { unique: false });
                console.log('Store "pedidos" creado');
            }
        };
    });
}

// Función para obtener un producto específico por ID
async function obtenerProductoPorId(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['productos'], 'readonly');
        const store = transaction.objectStore('productos');
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Función para guardar un producto individual
async function guardarProductoOffline(producto) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['productos'], 'readwrite');
        const store = transaction.objectStore('productos');
        const request = store.put(producto);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Guardar productos en IndexedDB
async function guardarProductosOffline(productos) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readwrite');
        const store = transaction.objectStore(STORE_PRODUCTOS);

        // Limpiar productos antiguos
        store.clear();

        // Agregar nuevos productos
        productos.forEach(producto => {
            store.put(producto);
        });

        transaction.oncomplete = () => {
            console.log(`${productos.length} productos guardados offline`);
            resolve();
        };

        transaction.onerror = () => {
            console.error('Error guardando productos:', transaction.error);
            reject(transaction.error);
        };
    });
}

// Obtener todos los productos de IndexedDB
async function obtenerProductosOffline() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const request = store.getAll();

        request.onsuccess = () => {
            console.log(`📦 ${request.result.length} productos cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error obteniendo productos offline:', request.error);
            reject(request.error);
        };
    });
}

// Obtener productos por categoría
async function obtenerProductosPorCategoria(categoria) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const index = store.index('categoria');
        const request = index.getAll(categoria);

        request.onsuccess = () => {
            console.log(`📦 ${request.result.length} productos de "${categoria}" cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error filtrando productos:', request.error);
            reject(request.error);
        };
    });
}

// Obtener productos por estado
async function obtenerProductosPorEstado(estado) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const index = store.index('estadoProducto');
        const request = index.getAll(estado);

        request.onsuccess = () => {
            console.log(`${request.result.length} productos de "${estado}" cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error filtrando productos:', request.error);
            reject(request.error);
        };
    });
}

// Obtener productos por marca
async function obtenerProductosPorMarca(modelo) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const index = store.index('modProducto');
        const request = index.getAll(modelo);

        request.onsuccess = () => {
            console.log(`${request.result.length} productos de "${modelo}" cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error filtrando productos:', request.error);
            reject(request.error);
        };
    });
}

// Obtener productos por procesador
async function obtenerProductosPorCPU(procesador) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const index = store.index('procesador');
        const request = index.getAll(procesador);

        request.onsuccess = () => {
            console.log(`${request.result.length} productos de "${procesador}" cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error filtrando productos:', request.error);
            reject(request.error);
        };
    });
}

// Obtener productos por ram
async function obtenerProductosPorRAM(ram) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const index = store.index('memoriaRam');
        const request = index.getAll(ram);

        request.onsuccess = () => {
            console.log(`${request.result.length} productos de "${ram}" cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error filtrando productos:', request.error);
            reject(request.error);
        };
    });
}

// Obtener productos por almacenamiento
async function obtenerProductosPorSSD(espacio) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const index = store.index('storage');
        const request = index.getAll(espacio);

        request.onsuccess = () => {
            console.log(`${request.result.length} productos de "${espacio}" cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error filtrando productos:', request.error);
            reject(request.error);
        };
    });
}

// Obtener un producto específico
async function obtenerProductoPorId(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error obteniendo producto:', request.error);
            reject(request.error);
        };
    });
}

// Guardar carrito en IndexedDB
async function guardarCarritoOffline(carrito) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_CARRITO], 'readwrite');
        const store = transaction.objectStore(STORE_CARRITO);

        // Limpiar carrito antiguo
        store.clear();

        // Agregar items del carrito
        carrito.forEach(item => {
            store.put(item);
        });

        transaction.oncomplete = () => {
            console.log('Carrito guardado en IndexedDB');
            resolve();
        };

        transaction.onerror = () => {
            console.error('Error guardando carrito:', transaction.error);
            reject(transaction.error);
        };
    });
}

// Obtener carrito de IndexedDB
async function obtenerCarritoOffline() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_CARRITO], 'readonly');
        const store = transaction.objectStore(STORE_CARRITO);
        const request = store.getAll();

        request.onsuccess = () => {
            console.log('Carrito cargado desde IndexedDB');
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error obteniendo carrito:', request.error);
            reject(request.error);
        };
    });
}

// Guardar pedido pendiente de sincronización
async function guardarPedidoOffline(pedido) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PEDIDOS], 'readwrite');
        const store = transaction.objectStore(STORE_PEDIDOS);

        const pedidoOffline = {
            ...pedido,
            sincronizado: false,
            fechaCreacion: new Date().toISOString()
        };

        const request = store.add(pedidoOffline);

        request.onsuccess = () => {
            console.log('Pedido guardado offline, se sincronizará cuando haya conexión');
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error guardando pedido offline:', request.error);
            reject(request.error);
        };
    });
}

// Obtener pedidos no sincronizados
async function obtenerPedidosNoSincronizados() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PEDIDOS], 'readonly');
        const store = transaction.objectStore(STORE_PEDIDOS);
        const index = store.index('sincronizado');
        const request = index.getAll(false);

        request.onsuccess = () => {
            console.log(`${request.result.length} pedidos pendientes de sincronización`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error obteniendo pedidos no sincronizados:', request.error);
            reject(request.error);
        };
    });
}

// Marcar pedido como sincronizado
async function marcarPedidoSincronizado(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PEDIDOS], 'readwrite');
        const store = transaction.objectStore(STORE_PEDIDOS);
        const request = store.get(id);

        request.onsuccess = () => {
            const pedido = request.result;
            if (pedido) {
                pedido.sincronizado = true;
                pedido.fechaSincronizacion = new Date().toISOString();
                store.put(pedido);
            }
        };

        transaction.oncomplete = () => {
            console.log(`Pedido ${id} marcado como sincronizado`);
            resolve();
        };

        transaction.onerror = () => {
            console.error('Error marcando pedido sincronizado:', transaction.error);
            reject(transaction.error);
        };
    });
}
// UTILIDADES

// Verificar si hay conexión a internet
function estaOnline() {
    return navigator.onLine;
}

// Detectar cambios en la conexión
function monitorearConexion(callbackOnline, callbackOffline) {
    window.addEventListener('online', () => {
        console.log('Conexión restaurada');
        if (callbackOnline) callbackOnline();
    });

    window.addEventListener('offline', () => {
        console.log('Sin conexión a internet');
        if (callbackOffline) callbackOffline();
    });
}
// EXPORTAR FUNCIONES

// Para uso con módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDB,
        guardarProductosOffline,
        obtenerProductosOffline,
        obtenerProductosPorCategoria,
        obtenerProductosPorEstado,
        obtenerProductosPorMarca,
        obtenerProductosPorCPU,
        obtenerProductosPorRAM,
        obtenerProductosPorSSD,
        obtenerProductoPorId,
        guardarCarritoOffline,
        obtenerCarritoOffline,
        guardarPedidoOffline,
        obtenerPedidosNoSincronizados,
        marcarPedidoSincronizado,
        estaOnline,
        monitorearConexion
    };
}