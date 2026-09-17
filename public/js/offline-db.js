class OfflineDB {
  constructor() {
    this.dbName = 'ProseinetOffline';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('pedidos')) {
          const objectStore = db.createObjectStore('pedidos', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  async guardarPedido(pedido) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pedidos'], 'readwrite');
      const objectStore = transaction.objectStore('pedidos');
      
      const pedidoOffline = {
        ...pedido,
        timestamp: Date.now(),
        synced: false,
        offline: true
      };

      const request = objectStore.add(pedidoOffline);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async obtenerPedidosPendientes() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pedidos'], 'readonly');
      const objectStore = transaction.objectStore('pedidos');
      const index = objectStore.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async marcarComoSincronizado(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pedidos'], 'readwrite');
      const objectStore = transaction.objectStore('pedidos');
      const request = objectStore.get(id);

      request.onsuccess = () => {
        const pedido = request.result;
        if (pedido) {
          pedido.synced = true;
          const updateRequest = objectStore.put(pedido);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async eliminarPedido(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pedidos'], 'readwrite');
      const objectStore = transaction.objectStore('pedidos');
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const offlineDB = new OfflineDB();