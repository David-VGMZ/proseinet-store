// Recuperar carrito o inicializarlo vacío
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function agregarAlCarrito(producto) {
    const item = carrito.find(p => p.id === producto.id);
    if (item) {
        item.cantidad++;
    } else {
        carrito.push(producto);
    }
    guardarCarrito();
    actualizarCarrito();
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(p => String(p.id) !== String(id));
    guardarCarrito();
    actualizarCarrito();
    const alert = document.createElement('div');
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'info',
        title: 'Producto eliminado del carrito'
    });
}

function vaciarCarrito() {
carrito = [];
guardarCarrito();
actualizarCarrito();
}
// Actualizar vista del carrito en el modal y contador
function actualizarCarrito() {
    const contenedor = document.getElementById('carrito-container');
    const contadores = document.querySelectorAll('.contador-carrito');
    const totalElement = document.getElementById('total-carrito');
    const btnProceder = document.getElementById('btnProcederPago');
    
    const cantidadTotal = carrito.reduce((acc, p) => acc + p.cantidad, 0);

    // Actualizamos cada contador encontrado en la página
    contadores.forEach(contador => {
        contador.textContent = cantidadTotal;
    });

    // Si el contenedor no existe, solo actualizar contador y salir
    if (!contenedor) {
        console.log('Contenedor del carrito no encontrado aún');
        return;
    }

    if (carrito.length === 0) {
        contenedor.innerHTML = '<p class="text-center text-muted py-4">Tu carrito está vacío</p>';
        if (totalElement) totalElement.textContent = '$0.00';
        if (btnProceder) btnProceder.disabled = true;
        return;
    }

    if (btnProceder) btnProceder.disabled = false;

    // Calcular total
    const total = carrito.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    
    console.log('Total calculado:', total);
    
    if (totalElement) {
        totalElement.textContent = '$' + total.toLocaleString('es-MX', { minimumFractionDigits: 2 });
        console.log('Total actualizado en el DOM');
    } else {
        console.log('Elemento total-carrito no encontrado');
    }

    if (contenedor) {
        contenedor.innerHTML = carrito.map(p => `
        <div class="producto border rounded p-2 my-2 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                <img src="${p.imagenes}" width="80" class="me-3 rounded" style="cursor: pointer;" onclick="window.location.href='/pages/producto.html#${p.id}'">
                <div> 
                    <h5 class="mb-1">${p.nombre}</h5>
                    <p>
                        $${p.precio.toLocaleString("es-MX")} x ${p.cantidad} pieza(s)
                        ${p.esMayorista ? '<small class="text-success me-1">(Mayoreo)</small>' : ''}
                    </p>
                </div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="eliminarDelCarrito('${p.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        `).join('');

        const totalDisplay = document.getElementById("carrito-total");
        if (totalDisplay) totalDisplay.innerText = `$${total.localStorage("es-MX")}`;
    };
}

// Mostrar carrito al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, actualizando carrito...');
    
    // Actualizar todo cuando la página esté completamente lista
    setTimeout(() => {
        actualizarCarrito();
    }, 100);
});

function showToast(msg, type = "success") {
    const container = document.getElementById("toastZone");

    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");

    toastEl.innerHTML = `
        <div class="d-flex mt-1">
            <div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    container.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // remover después de 4 segundos
    setTimeout(() => toastEl.remove(), 3000);
}