// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de tu proyecto
const firebaseConfig = {
  // Reemplazar con las credenciales web de tu proyecto
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias al DOM
const cuerpoTabla = document.getElementById('cuerpoTabla');
const btnBuscar = document.getElementById('btnBuscar');

// Función principal para cargar datos
async function cargarInventario() {
    cuerpoTabla.innerHTML = '<tr><td colspan="7" class="text-center">Cargando...</td></tr>';
    
    // Obtener valores de los filtros
    const categoria = document.getElementById('filtroCategoria').value;
    const estatus = document.getElementById('filtroEstatus').value;
    
    // Construir la consulta dinámica
    let q = collection(db, "inventario_master");
    let constraints = [];
    
    if (categoria) constraints.push(where("categoria", "==", categoria));
    if (estatus) constraints.push(where("estatus", "==", estatus));
    
    if (constraints.length > 0) {
        q = query(collection(db, "inventario_master"), ...constraints);
    }

    try {
        const querySnapshot = await getDocs(q);
        cuerpoTabla.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            cuerpoTabla.innerHTML += `
                <tr>
                    <td><span class="badge bg-secondary">${data.nLot || 'N/A'}</span></td>
                    <td>${data.categoria}</td>
                    <td><strong>${data.marca}</strong> ${data.modelo}</td>
                    <td>${data.ram} | ${data.procesador}</td>
                    <td><span class="font-monospace text-muted">${data.serie}</span></td>
                    <td>
                        <span class="badge ${data.estatus === 'Almacén' ? 'bg-success' : 'bg-warning text-dark'}">
                            ${data.estatus}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error obteniendo documentos: ", error);
        cuerpoTabla.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar datos</td></tr>';
    }
}

// Ejecutar al cargar la página y al hacer clic en filtrar
document.addEventListener('DOMContentLoaded', cargarInventario);
btnBuscar.addEventListener('click', cargarInventario);