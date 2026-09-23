import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, setDoc, doc, addDoc, serverTimestamp, getDoc, where, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBg9o3wVZoA26Aob2RnbVPV8vGv4GE44gs",
    authDomain: "primer-proyecto-7b2f4.firebaseapp.com",
    projectId: "primer-proyecto-7b2f4",
    storageBucket: "primer-proyecto-7b2f4.firebasestorage.app",
    messagingSenderId: "627220736817",
    appId: "1:627220736817:web:a2eb4f187322c609f11e10"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let dbReady = false;
let terminoBusqueda = '';

(async function inicializarDB() {
    try {
        await initDB();
        dbReady = true;
        console.log('IndexedDB lista para usar');
    } catch (error) {
        console.error('Error inicializando IndexedDB:', error);
        dbReady = false;
    }
})();

async function obtenerRolUsuario(uid) {
    try {
        const docRef = doc(db, "usuarios", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().rol || "usuario";
        } else {
            console.warn("Usuario no encontrado en Firestore");
            return "usuario";
        }
    } catch (error) {
        console.error("Error obteniendo rol:", error);
        return "usuario";
    }
}

onAuthStateChanged(auth, async (user) => {
    const btnLoginNav = document.getElementById('loginNavBtn');
    const btnRegisterNav = document.getElementById('registerNavBtn');
    const btnLogoutNav = document.getElementById('logoutBtn');
    const navInventario = document.getElementById('navInventario');

    if (user) {
        console.log("Usuario autenticado:", user.email);

        validarSesionAlCargar();

        const rol = await obtenerRolUsuario(user.uid);
        console.log("Rol del usuario:", rol);

        localStorage.setItem('userRole', rol);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);

        if (btnLoginNav) btnLoginNav.style.display = 'none';
        if (btnRegisterNav) btnRegisterNav.style.display = 'none';
        if (btnLogoutNav) btnLogoutNav.style.display = 'block';

        const toastMostrado = sessionStorage.getItem('loginToastShown');

        if (navInventario) {
            if (rol === 'Administrador' || rol === 'Operador') {
                navInventario.style.display = 'block';

                if (!toastMostrado) {
                    showToast(`Bienvenido ${rol}: ${user.email}`, 'success');
                    sessionStorage.setItem('loginToastShown', 'true');
                }
            } else {
                navInventario.style.display = 'none';

                if (!toastMostrado) {
                    showToast(`Bienvenido: ${user.email}`, 'success');
                    sessionStorage.setItem('loginToastShown', 'true');
                }
            }
        }

        reiniciarTemporizador();
    } else {
        console.log("No hay usuario autenticado");

        sessionStorage.removeItem('loginToastShown');

        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');

        if (btnLoginNav) btnLoginNav.style.display = 'block';
        if (btnRegisterNav) btnRegisterNav.style.display = 'block';
        if (btnLogoutNav) btnLogoutNav.style.display = 'none';
        if (navInventario) navInventario.style.display = 'none';

        clearTimeout(tiempoInactividad);
    }
});

// LOGIN
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const inputUser = document.getElementById('user');
    const inputPass = document.getElementById('pass');
    const errorMsg = document.getElementById('error-msg');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginBtn && inputUser && inputPass) {
        loginBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const email = inputUser.value.trim();
            const pass = inputPass.value;

            if (!email || !pass) {
                if (errorMsg) errorMsg.textContent = 'Completa todos los campos';
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email, pass);
                localStorage.setItem('ultimoAcceso', Date.now().toString());
                if (errorMsg) errorMsg.textContent = '';
                const modalEl = document.getElementById('loginModal');
                if (modalEl) {
                    const bs = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                    bs.hide();
                }
            } catch (e) {
                console.error('Login error:', e);
                if (errorMsg) errorMsg.textContent = 'Credenciales inválidas';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            try {
                await signOut(auth);
                localStorage.removeItem('ultimoAcceso');
                showToast('Sesión cerrada', 'primary');
            } catch (e) {
                console.error('Logout error', e);
            }
        });
    }

    // REGISTRO
    const registerBtn = document.getElementById('registerBtn');
    const regEmail = document.getElementById('regEmail');
    const regPass = document.getElementById('regPass');
    const regError = document.getElementById('regError');

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const email = regEmail.value.trim();
            const pass = regPass.value.trim();

            if (!email || !pass) {
                regError.textContent = "Completa todos los campos";
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                const user = userCredential.user;

                await setDoc(doc(db, "usuarios", user.uid), {
                    email: email,
                    rol: "usuario",
                    fechaCreacion: new Date().toISOString()
                });

                localStorage.setItem('ultimoAcceso', Date.now().toString());

                regError.textContent = "";

                const modalEl = document.getElementById('registerModal');
                const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modal.hide();

                showToast("Cuenta creada con éxito");
            } catch (e) {
                console.error(e);
                if (e.code === "auth/email-already-in-use") {
                    regError.textContent = "Este correo ya está registrado";
                } else if (e.code === "auth/weak-password") {
                    regError.textContent = "La contraseña debe tener al menos 6 caracteres";
                } else {
                    regError.textContent = "Error al registrar";
                }
            }
        });
    }
});

let tiempoInactividad;

const MINUTOS_LIMITE = 60;
const TIEMPO_LIMITE_INACTIVIDAD = MINUTOS_LIMITE * 60 * 1000;

function cerrarSesionInactividad() {
    const user = auth.currentUser;
    if (user) {
        signOut(auth).then(() => {
            showToast('Sesion cerrada por inactividad', 'warning');
            localStorage.removeItem('ultimoAcceso');
            setTimeout(() => window.location.reload(), 2000);
        }).catch((error) => {
            console.error('Error al cerrar sesion por inactividad', error);
        });
    }
}

function registrarActividad() {
    if (auth.currentUser) {
        localStorage.setItem('ultimoAcceso', Date.now().toString());
    }
}

function reiniciarTemporizador() {
    clearTimeout(tiempoInactividad);
    if (auth.currentUser) {
        registrarActividad();
        tiempoInactividad = setTimeout(cerrarSesionInactividad, TIEMPO_LIMITE_INACTIVIDAD);
    }
}

function validarSesionAlCargar() {
    const user = auth.currentUser;
    const ultimoAcceso = localStorage.getItem('ultimoAcceso');

    if (user && ultimoAcceso) {
        const tiempoTranscurrido = Date.now() - parseInt(ultimoAcceso, 10);

        if (tiempoTranscurrido > TIEMPO_LIMITE_INACTIVIDAD) {
            console.log("La sesion expiró mientras la pagina estaba cerrada");
            cerrarSesionInactividad();
        } else {
            reiniciarTemporizador();
        }
    }
}

window.addEventListener('load', reiniciarTemporizador);
document.addEventListener('mousemove', reiniciarTemporizador);
document.addEventListener('keypress', reiniciarTemporizador);
document.addEventListener('click', reiniciarTemporizador);
document.addEventListener('scroll', reiniciarTemporizador);
document.addEventListener('touchstart', reiniciarTemporizador);

let vistaActual = "col-6 col-md-3 col-lg-3 col-xl-2";

window.cambiarVista = function (clase) {
    vistaActual = clase;

    aplicarFiltrosGlobales();
};

// CARGAR Y RENDERIZAR PRODUCTOS
const productosSection = document.getElementById('productos-container');

async function cargarProductos() {

    // Animacion de Carga con Cards
    for (let i = 1; i < 20; i++) {
        productosSection.innerHTML += `
            <div class="col-6 col-md-4 col-lg-2 mb-2">
                <div class="card h-100 shadow border-0" style="border-radius:10px; cursor: pointer; background-color: #e2e2e2;">
                    <img src="/assets/img/gray-text.jpg" class="card-img-top w-100" style="aspect-ratio: 1 / 1; object-fit: cover; border-radius: 10px 10px 0 0;">
                    <div class="card-body p-3 d-flex flex-column">
                        <h5 class="card-title mb-2" style="font-size: 1rem; font-weight: 600; color: #e2e2e2;"> Proseinet App</h5>
                        <div class="mt-auto">
                            <p class="fw-bold mb-1" style="font-size: 1.2rem; color: #e2e2e2;">
                                9,999
                            </p>
                            <p class="m-0"><span class="badge" style="background-color: #e2e2e2; color: #e2e2e2;">000000</span></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    if (!navigator.onLine) {
        console.log('Sin conexión detectada, cargando desde IndexedDB...');
        await cargarProductosOffline();
        return;
    }

    try {
        const db = getFirestore();
        const productosRef = collection(db, "productos");

        const q = query(productosRef, where("mostrarEnInicio", "==", true));

        const querySnapshot = await getDocs(q);
        productosSection.innerHTML = '';

        if (querySnapshot.empty) {
            productosSection.innerHTML = '<p class="text-center w-100">No hay productos disponibles para mostrar en el inicio.</p>';
            return;
        }
        const lista = querySnapshot.docs.map(d => {
            const data = d.data();
            delete data.id;
            return { id: d.id, ...data };
        });
        listaGlobal = lista;
        console.log('Productos cargados:', lista.length);

        if (dbReady && lista.length > 0) {
            try {
                await guardarProductosOffline(lista);
                console.log('Productos guardados en IndexedDB');
            } catch (err) {
                console.warn('No se pudieron guardar en IndexedDB:', err);
            }
        }

        renderLista(lista);


    } catch (e) {
        console.error('Error cargando productos desde Firebase:', e);

        console.log('Intentando cargar desde IndexedDB...');
        await cargarProductosOffline();
    }
}

let filtrosActivos = {

    categoria: 'todas',
    modelo: null,
    cpu: null,
    ram: null,
    ssd: null,
    estado: null,
    ordenPrecio: null,
    busqueda: ''
};

// Cargar productos desde IndexedDB
async function cargarProductosOffline() {
    try {
        // Esperar a que IndexedDB esté lista
        if (!dbReady) {
            console.log('Esperando IndexedDB...');
            await initDB();
            dbReady = true;
        }

        const productosOffline = await obtenerProductosOffline();
        listaGlobal = productosOffline;
        renderLista(productosOffline);

        if (productosOffline.length > 0) {
            console.log('Productos cargados desde IndexedDB:', productosOffline.length);
            listaGlobal = productosOffline;
            renderLista(productosOffline);

            // SOLO MOSTRAR TOAST SI NO SE HA MOSTRADO ANTES
            if (!sessionStorage.getItem('offlineToastShown')) {
                showToast('Modo offline: mostrando productos guardados', 'warning');
                sessionStorage.setItem('offlineToastShown', 'true');
            }
        } else {
            productosSection.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning text-center my-5">
                        <i class="fas fa-wifi-slash fa-3x mb-3"></i>
                        <h5>Sin conexión</h5>
                        <p>No hay productos disponibles offline.<br>Conéctate a internet para cargar el catálogo.</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando productos offline:', error);
        productosSection.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger text-center my-5">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                    <h5>Error</h5>
                    <p>No se pudieron cargar los productos</p>
                </div>
            </div>
        `;
    }
}

function obtenerNombreCpu(procesador) {
    const nombre = {
        'i3': 'i3',
        'i5': 'i5',
        'i7': 'i7',
        'i9': 'i9',
        'ix-bronze': 'Xeon Bronze',
        'ix-silver': 'Xeon Silver',
        'ix-gold': 'Xeon Gold',
        'ix-platinum': 'Xeon Platinum',
        'ix-w': 'Xeon W',
        'u3': 'Ultra 3',
        'u5': 'Ultra 5',
        'u7': 'Ultra 7',
        'u9': 'Ultra 9',
        'M1': 'M1 Apple',
        'ryzen-5': 'Ryzen 5',
        'ryzen-7': 'Ryzen 7',
        'ryzen-9': 'Ryzen 9',
    };
    return nombre[procesador] || procesador;
}

function obtenerNombreEspacio(espacio) {
    const nombre = {
        '64gb': '64',
        '128gb': '128',
        '240gb': '240',
        '256gb': '256',
        '512gb': '512',
        '1tb': '1',
        '2tb': '2',
    };
    return nombre[espacio] || espacio;
}

function obtenerNombreGpu(graficos) {
    const nombre = {
        't2000': 'Quadro T2000',
        't1000': 'Quadro T1000',
        't1200': 'Quadro T1200',
        't600': 'Quadro T600',
        'p4000': 'Quadro P4000',
        'rtxA3000': 'RTX A3000',
        'rtx3000': 'RTX 3000',
        'rtx5000': 'RTX 5000',
        'amd-wx1200': 'AMD Radeon Pro WX 2100',
    };
    return nombre[graficos] || graficos;
}

function obtenerNombreVRAM(vram) {
    const nombre = {
        '2gb-vram': '2GB VRAM',
        '4gb-vram': '4GB VRAM',
        '6gb-vram': '6GB VRAM',
        '8gb-vram': '8GB VRAM',
        '12gb-vram': '12GB VRAM',
        '16gb-vram': '16GB VRAM',
        '24gb-vram': '24GB VRAM',
    };
    return nombre[vram] || vram;
}

function obtenerTipoEspacio(tipoEspacio) {
    const nombre = {
        'hdd': 'HDD',
        'ssd': 'SSD',
        'ssd-m2': 'NVMe',
    };
    return nombre[tipoEspacio] || tipoEspacio;
}

function renderLista(lista) {

    productosSection.innerHTML = "";

    if (!lista.length) {
        productosSection.innerHTML = '<p class="text-center text-muted">No hay productos disponibles</p>';
        return;
    }

    lista.forEach((p) => {
        let imgSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZTVlN2ViIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIvPjx0ZXh0IGZpbGw9IiM5Y2EzYWYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiB4PSI1MCUiIHk9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+U2luIEltYWdlbjwvdGV4dD48L3N2Zz4=';

        if (Array.isArray(p.imagenes) && p.imagenes.length > 0) {
            const primeraImagen = p.imagenes[0];
            if (typeof primeraImagen === 'string' && primeraImagen.trim() !== '') {
                imgSrc = primeraImagen;
            } else if (typeof primeraImagen === 'object' && primeraImagen.dataURL) {
                imgSrc = primeraImagen.dataURL;
            }
        }

        let badgeHTML = '';
        if (p.estado) {
            const estadoStr = p.estado.toLowerCase();
            if (estadoStr === 'nuevo') {
                badgeHTML = `<span class="badge bg-success position-absolute top-50 start-0 mx-2 mt-md-1" style="z-index: 2; font-size: 0.8rem;">Nuevo</span>`;
            } else if (estadoStr === 'seminuevo') {
                badgeHTML = `<span class="badge bg-secondary position-absolute top-50 start-0 mx-2 mt-md-1" style="z-index: 2; font-size: 0.8rem;">Seminuevo</span>`;
            } else if (estadoStr === 'remate') {
                badgeHTML = `<span class="badge bg-danger text-white position-absolute top-50 start-0 mx-2 mt-md-1" style="z-index: 2; font-size: 0.8rem;">Remate</span>`;
            } else if (estadoStr === 'refur') {
                badgeHTML = `<span class="badge bg-badge-refur text-white position-absolute top-50 start-0 mx-2 mt-md-1" style="z-index: 2; font-size: 0.8rem;">Refurbished</span>`;
            }
        }

        const col = document.createElement("div");
        col.className = `${vistaActual} d-flex align-items-stretch`;


        if ((p.categoria === "proyectores") || (p.categoria === "monitor") || (p.categoria === "docking")) {
            col.innerHTML = `
                    <div class="card h-100 shadow border-0 position-relative" style="border-radius:10px; cursor: pointer;" 
                        onclick="window.location.href='/pages/producto.html#${p.id}'">

                        ${badgeHTML}
                        
                        <img src="${imgSrc}" class="card-img-top w-100" style="aspect-ratio: 1 / 1; object-fit: cover; border-radius: 10px 10px 0 0;" alt="${p.nombre}">
                        
                        <div class="card-body p-3 d-flex flex-column">
                            <h5 class="card-title mb-2" style="font-size: .85rem; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                                overflow: hidden;" title="${p.nombre}">${p.nombre}</h5>
                            
                            <div class="mt-auto">
                                <p class="fw-bold text-danger mb-1" style="font-size: 1.2rem;">
                                    $${Number(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </p>
                                <p class="m-0"><span class="badge bg-black">${p.clave}</span></p>
                            </div>
                        </div>
                    </div>
            `;
        } else if (p.categoria === "workLap" || p.categoria === "workServ") {
            col.innerHTML = `
                    <div class="card h-100 shadow border-0 position-relative" style="border-radius:10px; cursor: pointer;" 
                        onclick="window.location.href='/pages/producto.html#${p.id}'">

                        ${badgeHTML}
                        
                        <img src="${imgSrc}" class="card-img-top w-100" style="aspect-ratio: 1 / 1; object-fit: cover; border-radius: 10px 10px 0 0;" alt="${p.nombre}">
                        
                        <div class="card-body p-3 d-flex flex-column">
                            <h5 class="card-title mb-2" style="font-size: .85rem; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                                overflow: hidden;" title="${p.nombre}">${p.nombre} ${obtenerNombreCpu(p.procesador)} ${obtenerNombreGpu(p.graficos)} ${obtenerNombreVRAM(p.vram)} ${p.ram} / ${p.espacio} ${obtenerTipoEspacio(p.tipoEspacio)}</h5>
                            
                            <div class="mt-auto">
                                <p class="fw-bold text-danger mb-1" style="font-size: 1.2rem;">
                                    $${Number(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </p>
                                <p class="m-0"><span class="badge bg-black">${p.clave}</span></p>
                            </div>
                        </div>
                    </div>
            `;
        } else {
            col.innerHTML = `
                    <div class="card h-100 shadow border-0 position-relative" style="border-radius:10px; cursor: pointer;" 
                        onclick="window.location.href='/pages/producto.html#${p.id}'">

                        ${badgeHTML}
                        
                        <img src="${imgSrc}" class="card-img-top w-100" style="aspect-ratio: 1 / 1; object-fit: cover; border-radius: 10px 10px 0 0;" alt="${p.nombre}">
                        
                        <div class="card-body p-3 d-flex flex-column">
                            <h5 class="card-title mb-2" style="font-size: 0.85rem; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                                overflow: hidden;" title="${p.nombre}">${p.nombre} ${obtenerNombreCpu(p.procesador)} ${p.ram} / ${p.espacio} ${obtenerTipoEspacio(p.tipoEspacio)}</h5>
                            
                            <div class="mt-auto">
                                <p class="fw-bold text-danger mb-1" style="font-size: 1.2rem;">
                                    $${Number(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </p>
                                <p class="m-0"><span class="badge bg-black">${p.clave}</span></p>
                            </div>
                        </div>
                    </div>
            `;
        }
        productosSection.appendChild(col);
    });
}

// DEBUG: Verificar estado de IndexedDB
window.debugIndexedDB = async function () {
    console.log('=== DEBUG INDEXEDDB ===');
    console.log('dbReady:', dbReady);

    try {
        await initDB();
        const productos = await obtenerProductosOffline();
        console.log('Productos en IndexedDB:', productos.length);
        console.log('Productos:', productos);

        if (productos.length > 0) {
            console.log('IndexedDB funciona correctamente');
        } else {
            console.warn('IndexedDB vacía, necesitas cargar productos con internet primero');
        }
    } catch (error) {
        console.error('Error:', error);
    }
    console.log('======================');
};

console.log('Ejecuta debugIndexedDB() en consola para verificar');

document.getElementById('clearSearch').addEventListener('click', function () {
    document.getElementById('busquedaInput').value = '';
    terminoBusqueda = '';
    cargarProductos();
});

// SCROLL DE CATEGORÍAS
const categoriasContainer = document.getElementById('categoriasContainer');
const scrollPrev = document.getElementById('scrollPrev');
const scrollNext = document.getElementById('scrollNext');

if (scrollPrev && scrollNext && categoriasContainer) {
    scrollPrev.addEventListener('click', () => {
        const scrollAmount = 300;
        categoriasContainer.querySelector('.categorias-scroll').scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    scrollNext.addEventListener('click', () => {
        const scrollAmount = 300;
        categoriasContainer.querySelector('.categorias-scroll').scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
}

window.ordenarPorPrecio = function (orden) {
    console.log('Ordenando productos por precio:', orden);

    if (!listaGlobal || listaGlobal.length === 0) {
        console.warn("No hay productos cargados para ordenar");
        return;
    }

    const listaOrdenada = [...listaGlobal].sort((a, b) => {

        const precioA = parseFloat(a.precio) || 0;
        const precioB = parseFloat(b.precio) || 0;

        if (orden === 'asc') {
            return precioA - precioB;
        } else {
            return precioB - precioA;
        }
    });

    renderLista(listaOrdenada);
};

window.filtrarModelo = function (mod, elemento) {
    console.log('Filtrando por modelo:', mod);

    const imgCarousel = document.getElementById('carouselInicio');

    if (filtrosActivos.modelo === mod) {
        filtrosActivos.modelo = null;
        imgCarousel.style.display = 'none';
        if (elemento) elemento.classList.remove('active');
    } else {
        imgCarousel.style.display = 'block';
        filtrosActivos.modelo = mod;
        filtrosActivos.categoria = 'todas';
        filtrosActivos.cpu = null;
        filtrosActivos.ram = null;
        filtrosActivos.ssd = null;
        filtrosActivos.estado = null;
        document.querySelectorAll('.categoria-item').forEach(i => i.classList.remove('active'));
        if (elemento) elemento.classList.add('active');
    }

    aplicarFiltrosGlobales();
};

function actualizarEstadoBotonPrincipal() {
    const hayFiltros = filtrosActivos.cpu || filtrosActivos.ram || filtrosActivos.ssd || filtrosActivos.ordenPrecio || filtrosActivos.estado;
    const btnDesk = document.getElementById('btnMainFiltroDesk');
    const btnMovil = document.getElementById('btnMainFiltroMovil');

    const aplicarEstilo = (btn) => {
        if (!btn) return;
        if (hayFiltros) {

            btn.classList.add('bg-dark', 'text-white');
            btn.classList.remove('bg-white', 'text-dark');
            const icon = btn.querySelector('.fa-filter');
            if (icon) { icon.classList.remove('text-dark'); icon.classList.add('text-white'); }
        } else {

            btn.classList.remove('bg-dark', 'text-white');
            btn.classList.add('bg-white', 'text-dark');
            const icon = btn.querySelector('.fa-filter');
            if (icon) { icon.classList.remove('text-white'); icon.classList.add('text-dark'); }
        }
    }

    aplicarEstilo(btnDesk);
    aplicarEstilo(btnMovil);
}

window.cerrarDropdownFiltros = function () {
    ['btnMainFiltroDesk', 'btnMainFiltroMovil'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            try {
                if (typeof bootstrap !== 'undefined' && bootstrap.Dropdown) {
                    const drop = bootstrap.Dropdown.getInstance(btn) || new bootstrap.Dropdown(btn);
                    if (drop) {
                        drop.hide();
                    }
                }
            } catch (e) {
                console.error("Error cerrando dropdown:", e);
            }
            btn.classList.remove('show');
            btn.setAttribute('aria-expanded', 'false');
            const menu = btn.nextElementSibling;
            if (menu && menu.classList.contains('dropdown-menu')) {
                menu.classList.remove('show');
            }
        }
    });
};

window.filtrarCPU = function (tipo, elemento) {
    filtrosActivos.cpu = tipo;

    document.querySelectorAll('#collapseCPU .categoria-item, #collapseCPUMovil .categoria-item').forEach(el => el.classList.remove('active'));
    if (elemento && tipo) elemento.classList.add('active');

    actualizarEstadoBotonPrincipal();
    aplicarFiltrosGlobales();
    cerrarDropdownFiltros();
};

window.filtrarEstado = function (estado, elemento) {
    filtrosActivos.estado = estado;

    document.querySelectorAll('#collapseEstado .categoria-item, #collapseEstadoMovil .categoria-item').forEach(el => el.classList.remove('active'));
    if (elemento && estado) elemento.classList.add('active');

    actualizarEstadoBotonPrincipal();
    aplicarFiltrosGlobales();
    cerrarDropdownFiltros();
};

window.filtrarRAM = function (ram, elemento) {
    filtrosActivos.ram = ram;

    document.querySelectorAll('#collapseRAM .categoria-item, #collapseRAMMovil .categoria-item').forEach(el => el.classList.remove('active'));
    if (elemento && ram) elemento.classList.add('active');

    actualizarEstadoBotonPrincipal();
    aplicarFiltrosGlobales();
    cerrarDropdownFiltros();
};

window.filtrarSSD = function (espacio, elemento) {
    filtrosActivos.ssd = espacio;

    document.querySelectorAll('#collapseSSD .categoria-item, #collapseSSDMovil .categoria-item').forEach(el => el.classList.remove('active'));
    if (elemento && espacio) elemento.classList.add('active');

    actualizarEstadoBotonPrincipal();
    aplicarFiltrosGlobales();
    cerrarDropdownFiltros();
};

window.ordenarPorPrecio = function (orden, elemento) {
    filtrosActivos.ordenPrecio = orden;

    document.querySelectorAll('#collapsePrecio .categoria-item, #collapsePrecioMovil .categoria-item').forEach(el => el.classList.remove('active'));
    if (elemento && orden) elemento.classList.add('active');

    actualizarEstadoBotonPrincipal();
    aplicarFiltrosGlobales();
    cerrarDropdownFiltros();
};

window.buscarProductos = function () {
    const texto = document.getElementById('busquedaInput').value.trim();
    filtrosActivos.busqueda = texto;
    aplicarFiltrosGlobales();
};

function aplicarFiltrosGlobales() {

    if (!listaGlobal || listaGlobal.length === 0) return;

    let resultado = [...listaGlobal];
    const imgCarousel = document.getElementById('carouselInicio');

    if (filtrosActivos.busqueda) {
        const txt = filtrosActivos.busqueda.toLowerCase();
        resultado = resultado.filter(p =>
            (p.nombre && p.nombre.toLowerCase().includes(txt)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(txt)) ||
            (p.clave && p.clave.toLowerCase().includes(txt)) ||
            (p.modelo && p.modelo.toLowerCase().includes(txt)) ||
            (p.estado && p.estado.toLowerCase().includes(txt))
        );
    }

    if (filtrosActivos.categoria !== 'todas') {
        resultado = resultado.filter(p => p.categoria === filtrosActivos.categoria);
        imgCarousel.style.display = 'none';
    } else {
        imgCarousel.style.display = 'block';
    }

    if (filtrosActivos.modelo) {
        resultado = resultado.filter(p =>
            p.modelo && p.modelo.toLowerCase() === filtrosActivos.modelo.toLowerCase()
        );
        imgCarousel.style.display = 'none';
    }

    if (filtrosActivos.estado) {
        resultado = resultado.filter(p =>
            p.estado && p.estado.toLowerCase() === filtrosActivos.estado.toLowerCase()
        );
        imgCarousel.style.display = 'none';
    }

    if (filtrosActivos.cpu) {
        resultado = resultado.filter(p =>
            p.procesador && p.procesador.toLowerCase().includes(filtrosActivos.cpu.toLowerCase())
        );
        imgCarousel.style.display = 'none';
    }

    if (filtrosActivos.ram) {
        resultado = resultado.filter(p => p.ram && p.ram.toLowerCase() === filtrosActivos.ram.toLowerCase());
        imgCarousel.style.display = 'none';
    }

    if (filtrosActivos.ssd) {
        resultado = resultado.filter(p => p.espacio && p.espacio.toLowerCase() === filtrosActivos.ssd.toLowerCase());
        imgCarousel.style.display = 'none';
    }

    if (filtrosActivos.ordenPrecio) {
        resultado.sort((a, b) => {
            const precioA = parseFloat(a.precio) || 0;
            const precioB = parseFloat(b.precio) || 0;
            return filtrosActivos.ordenPrecio === 'asc' ? precioA - precioB : precioB - precioA;
        });
        imgCarousel.style.display = 'none';
    }

    renderLista(resultado);
}

window.filtrarCategoria = function (cat, elemento) {
    console.log('Filtrando por categoría:', cat);

    filtrosActivos.categoria = cat;

    filtrosActivos.modelo = null;
    filtrosActivos.cpu = null;
    filtrosActivos.ram = null;
    filtrosActivos.ssd = null;
    filtrosActivos.estado = null;

    document.querySelectorAll('.categoria-item').forEach(i => i.classList.remove('active'));
    if (elemento) {
        elemento.classList.add('active');
        elemento.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    aplicarFiltrosGlobales();
}

window.limpiarFiltros = function () {
    const categoriaActual = filtrosActivos.categoria;

    filtrosActivos = {
        categoria: categoriaActual,
        modelo: null,
        cpu: null,
        ram: null,
        ssd: null,
        estado: null,
        ordenPrecio: null,
        busqueda: ''
    };

    const acordeones = ['collapseCPU', 'collapseCPUMovil', 'collapseRAM', 'collapseRAMMovil', 'collapseSSD', 'collapseSSDMovil', 'collapsePrecio', 'collapsePrecioMovil', 'collapseEstado', 'collapseEstadoMovil'];
    acordeones.forEach(id => {
        const acc = document.getElementById(id);
        if (acc) {
            acc.querySelectorAll('.categoria-item').forEach(el => el.classList.remove('active'));
        }
    });

    document.getElementById('busquedaInput').value = '';

    actualizarEstadoBotonPrincipal();
    cerrarDropdownFiltros();

    const botones = ['btnFiltroCPU', 'btnFiltroRAM', 'btnFiltroSSD', 'btnFiltroPrecio'];
    const textoOriginales = ['CPU', 'RAM', 'SSD', 'Precios'];

    botones.forEach((id, index) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.innerText = textoOriginales[index];
            btn.classList.remove('filter-active-bg');
        }
    });

    aplicarFiltrosGlobales();
};

// INICIAR
cargarProductos();

function compressImage(file, maxSize = 512) {
    return new Promise((resolve, reject) => {

        const reader = new FileReader();
        reader.onload = e => {

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");

                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataURL = canvas.toDataURL("image/jpeg", 0.75);

                resolve({
                    name: file.name,
                    type: "image/jpeg",
                    dataURL: dataURL
                });
            };

            img.onerror = reject;
            img.src = e.target.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

monitorearConexion(
    async () => {
        showToast('Conexión restaurada', 'success');

        sessionStorage.removeItem('offlineToastShown');

        try {
            const pedidosPendientes = await obtenerPedidosNoSincronizados();
            if (pedidosPendientes.length > 0) {
                console.log(`Sincronizando ${pedidosPendientes.length} pedidos pendientes...`);

                for (const pedido of pedidosPendientes) {
                    try {
                        const docRef = await addDoc(collection(db, 'pedidos'), {
                            ...pedido,
                            fecha: serverTimestamp()
                        });

                        await marcarPedidoSincronizado(pedido.id);
                        console.log(`Pedido ${pedido.id} sincronizado con ID ${docRef.id}`);
                    } catch (error) {
                        console.error(`Error sincronizando pedido ${pedido.id}:`, error);
                    }
                }

                showToast(`${pedidosPendientes.length} pedido(s) sincronizado(s)`, 'success');
            }
        } catch (error) {
            console.error('Error en sincronización:', error);
        }

        cargarProductos();
    },
    () => {
        if (!sessionStorage.getItem('offlineToastShown')) {
            showToast('Sin conexión - Modo offline activado', 'warning');
            sessionStorage.setItem('offlineToastShown', 'true');
        }
        cargarProductos();
    }
);

function buscarProductos() {
    const texto = document.getElementById('busquedaInput').value.toLowerCase().trim();
    const imgCarousel = document.getElementById('carouselInicio');

    if (!texto) {
        renderLista(listaGlobal);
        imgCarousel.style.display = 'block';
        return;
    } else {
        imgCarousel.style.display = 'none';
    }

    const filtrados = listaGlobal.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(texto)) ||
        (p.categoria && p.categoria.toLowerCase().includes(texto)) ||
        (p.clave && p.clave.toLowerCase().includes(texto)) ||
        (p.modelo && p.modelo.toLowerCase().includes(texto))
    );

    renderLista(filtrados);
}

window.buscarProductos = buscarProductos;