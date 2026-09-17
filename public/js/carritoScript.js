import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, setDoc, doc, addDoc, serverTimestamp, getDoc, updateDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getMessaging, onMessage, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBg9o3wVZoA26Aob2RnbVPV8vGv4GE44gs",
  authDomain: "primer-proyecto-7b2f4.firebaseapp.com",
  projectId: "primer-proyecto-7b2f4",
  storageBucket: "primer-proyecto-7b2f4.firebasestorage.app",
  messagingSenderId: "627220736817",
  appId: "1:627220736817:web:a2eb4f187322c609f11e10",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// HACER DISPONIBLE GLOBALMENTE
window.firebaseDB = db;
window.firebaseAuth = auth;
window.addDocFirebase = addDoc;
window.collectionFirebase = collection;
window.serverTimestampFirebase = serverTimestamp;

// FUNCIÓN PARA OBTENER ROL
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

// AUTH STATE LISTENER
onAuthStateChanged(auth, async (user) => {
  const btnLoginNav = document.getElementById("loginNavBtn");
  const btnRegisterNav = document.getElementById("registerNavBtn");
  const btnLogoutNav = document.getElementById("logoutBtn");
  const navInventario = document.getElementById("navInventario");

  if (user) {
    console.log("Usuario autenticado:", user.email);

    const rol = await obtenerRolUsuario(user.uid);
    console.log("Rol del usuario:", rol);

    localStorage.setItem("userRole", rol);
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);

    if (btnLoginNav) btnLoginNav.style.display = "none";
    if (btnRegisterNav) btnRegisterNav.style.display = "none";
    if (btnLogoutNav) btnLogoutNav.style.display = "block";
  } else {
    console.log("No hay usuario autenticado");

    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");

    if (btnLoginNav) btnLoginNav.style.display = "block";
    if (btnRegisterNav) btnRegisterNav.style.display = "block";
    if (btnLogoutNav) btnLogoutNav.style.display = "none";
    if (navInventario) navInventario.style.display = "none";
  }
});

// LOGIN
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const inputUser = document.getElementById("user");
  const inputPass = document.getElementById("pass");
  const errorMsg = document.getElementById("error-msg");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn && inputUser && inputPass) {
    loginBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const email = inputUser.value.trim();
      const pass = inputPass.value;

      if (!email || !pass) {
        if (errorMsg) errorMsg.textContent = "Completa todos los campos";
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, email, pass);
        if (errorMsg) errorMsg.textContent = "";
        const modalEl = document.getElementById("loginModal");
        if (modalEl) {
          const bs =
            bootstrap.Modal.getInstance(modalEl) ||
            new bootstrap.Modal(modalEl);
          bs.hide();
        }
      } catch (e) {
        console.error("Login error:", e);
        if (errorMsg) errorMsg.textContent = "Credenciales inválidas";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      try {
        await signOut(auth);
        showToast("Sesión cerrada", "info");
      } catch (e) {
        console.error("Logout error", e);
      }
    });
  }
});

const mp = new MercadoPago("APP_USR-878d3c06-9398-479d-ac89-9f2f4a61b9f5", {
  locale: "es-MX",
});

const bricksBuilder = mp.bricks();

window.renderCardBrick = async (total) => {
  const settings = {
    initialization: {
      amount: total,
      payer: {
        email: localStorage.getItem("userEmail") || "test_user_123@testuser.com",
      },
    },
    customization: {
      visual: {
        style: {
          theme: "default",
        },
      },
    },
    callbacks: {
      onReady: () => {
        console.log("Brick de tarjeta listo");
      },
      onSubmit: (formData) => {
        const pedidoIdActual =
          document.getElementById("pedidoIdDisplay")?.innerText || "TEMP_ID";

        return new Promise((resolve, reject) => {
          const scriptURL = "https://script.google.com/macros/s/AKfycbzi6CH44HXea7UmSK5ddqQRplI8vVJ2WpxzQzh1UbFCI4Iw6IoG8lCCLzLWDv4Q0BcT/exec";

          fetch(scriptURL, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
              ...formData,
              external_reference: pedidoIdActual,
            }),
          })
            .then(async (response) => {
              const resultado = await response.json();

              if (resultado.status === "approved") {

                showToast("Procesando pago...", "info");
                await reducirStock(carrito);
                window.confirmarPedido(null, "Pagado");
                resolve();

              } else if ((resultado.status === "in_process") || (resultado.status_detail === "pending_review_manual")) {

                showToast("Tu pago está en revisión. Te avisaremos por email.", "info");
                alert('Tu pago está en revisión. Te avisaremos por email.');
                window.confirmarPedido(null, "Pendiente");

              } else {
                const mensajeError = resultado.status_detail || "Consulta con tu banco";
                showToast("Pago rechazado: " + mensajeError, "danger");
                reject();
              }
            })
            .catch((error) => {
              console.error(
                "Error al conectar con el servidor de pagos:",
                error,
              );
              showToast("Error de conexión", "danger");
              reject();
            });
        });
      },
      onError: (error) => {
        console.error("Error en el Brick:", error);
      },
    },
  };
  window.cardBrickController = await bricksBuilder.create(
    "cardPayment",
    "paymentCardBrick_container",
    settings,
  );
};

// Al confirmar la compra en carrito.html
async function guardarTokenUsuario(userId) {
  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      console.error("No se encontro el service worker registrado");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey:
        "BOBNEhfpPbnz0ew_HRCewocD6KyQYLy9ZmW0fjE6I4FThbc1vEcqW5hZD6SzugWi3GLpS9m7c__LiVyCvj3BLeM",
      serviceWorkerRegistration: registration,
    });
    if (token) {
      const userRef = doc(db, "usuarios", userId);
      await updateDoc(userRef, {
        fcmToken: token,
        ultimoAcceso: new Date(),
      });
      console.log("Token FCM actualizado con éxito");
    } else {
      console.warn("No se pudo obtener el token de permiso.");
    }
  } catch (error) {
    console.error("Error al guardar el token FCM:", error);
  }
}

// 2. FUNCIÓN PARA PDF Y EMAIL (Corregida)
async function procesarDocumentacionPedido(pedido, pedidoId) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configuración del PDF
    doc.setFillColor(161, 0, 0);
    doc.rect(0, 0, 210, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PROSEINET", 105, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Comprobante de Pedido", 105, 21, { align: "center" });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Detalles del Pedido", 14, 40);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`ID de Pedido:`, 14, 48);
    doc.setFont("helvetica", "bold");
    doc.text(`${pedidoId}`, 36, 48);

    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 54);
    doc.text(`Método: ${pedido.metodoEnvio}`, 14, 60);

    doc.setFont("helvetica", "bold");
    doc.text("Datos de Envío", 110, 40);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${pedido.datosEnvio.nombre}`, 110, 48);
    doc.text(`Email: ${pedido.userEmail}`, 110, 54);

    let direccionY = 60;
    let textoDireccion = "";
    if (pedido.metodoEnvio == "Pago a la Entrega") {
      textoDireccion = `Domicilio: ${pedido.datosEnvio.direccion}`;
    } else {
      textoDireccion = `Domicilio: ${pedido.datosEnvio.direccion}, ${pedido.datosEnvio.ciudad}, C.P. ${pedido.datosEnvio.codigoPostal}`
    }
    const lineasDireccion = doc.splitTextToSize(textoDireccion, 85);
    doc.text(lineasDireccion, 110, direccionY);

    // Generar Tabla de Productos
    const filas = pedido.productos.map((p) => [
      p.nombre,
      p.cantidad.toString(),
      `$${p.precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      `$${(p.precio * p.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    ]);

    doc.autoTable({
      startY: 75,
      head: [["Producto", "Cant.", "Precio Unitario", "Subtotal"]],
      body: filas,
      theme: "striped",
      headStyles: { 
        fillColor: [161, 0, 0],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center' 
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { top: 10, left: 14, rigth: 14 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(110, finalY - 6, 196, finalY - 6);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL A PAGAR: ", 110, finalY);

    const totalString = `$${pedido.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    doc.text(totalString, 196, finalY, { align: "right" });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "italic");
    doc.text("¡Gracias por tu compra en PROSEINET!", 105, pageHeight - 20, { align: "center" });

    // DESCARGAR PDF PRIMERO (Para asegurar que el cliente lo tenga)
    doc.save(`Comprobante_${pedidoId}.pdf`);

    const urlPdf = await subirPdfACloudinary(doc, pedidoId);

    const productosHTML = pedido.productos.map((p) => `
          <table width="100%" style="margin-bottom: 15px;">
              <tr>
                  <td width="80">
                      <img src="${p.imagenes}" width="70" style="border-radius: 5px;">
                  </td>
                  <td>
                      <div style="font-weight: bold; color: #333;">${p.nombre}</div>
                      <div style="color: #666; font-size: 0.9em;">CANT: ${p.cantidad}</div>
                  </td>
                  <td style="text-align: right; font-weight: bold; vertical-align: top;">
                      $${Number(p.precio * p.cantidad).toLocaleString("es-MX")}
                  </td>
              </tr>
          </table>
        `,
      )
      .join("");
      
    // ENVIAR EMAIL POR RESEND
    if (pedido.userEmail && pedido.userEmail.includes("@")) {
      const scriptURL = "https://script.google.com/macros/s/AKfycbze3QGrBPBGNidEVxeWU0AUanqOWD7sstU0TRMboZ6tfUiaQmgsrz3-ilvCiISi8aXwyA/exec";
      const cloudName = "dei5fnqt5";
      const urlCloudinary = `https://res.cloudinary.com/${cloudName}/image/upload/v1776099264/comprobante_${pedidoId}.pdf`;
      const adminEmail = "proseinet.sas@gmail.com";

      const emailDataAdmin = {
        action: "enviarEmailResend",
        pedidoId: pedidoId,
        nombre_cliente: pedido.datosEnvio.nombre,
        user_email: adminEmail,
        total_pedido: pedido.total.toLocaleString("es-MX"),
        lista_productos_html: productosHTML,
        link_pdf: urlCloudinary,
        mensaje: `Nuevo Pedido Recibido. Cliente: ${pedido.userEmail} (ID: ${pedido.userId})`,
        mensaje_cliente: `
          <b>Detalles Técnicos:</b><br>
          - Nombre: ${pedido.datosEnvio.nombre}<br>
          - Teléfono: ${pedido.datosEnvio.telefono}<br>
          - Fecha: ${new Date().toLocaleDateString()}<br>
          - Notas: ${pedido.datosEnvio.notas || 'Sin notas'}<br>
          `,
        esAdmin: true
      }

      const emailData = {
        action: "enviarEmailResend",
        pedidoId: pedidoId,
        nombre_cliente: pedido.datosEnvio.nombre,
        user_email: pedido.userEmail,
        total_pedido: pedido.total.toLocaleString("es-MX"),
        lista_productos_html: productosHTML,
        link_pdf: urlCloudinary,
        mensaje: `Descarga tu comprobante de pago aquí: ${urlCloudinary}`,
        mensaje_cliente: `Dirección: ${pedido.datosEnvio.direccion}, Tel: ${pedido.datosEnvio.telefono}`,
      };

      console.log("Enviando a GAS:", emailData);

      fetch(scriptURL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(emailData),
      })
        .then(() => {
          showToast("Comprobante enviado al correo", "success");
        })
        .catch((err) => console.error("Error enviando email:", err));

        fetch(scriptURL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(emailDataAdmin)
        })
        .then(() => console.log("Notificación enviada al administrador"))
        .catch(err => console.error("Error email admin:", err));
    } else {
      console.warn(
        "No se envió correo porque el usuario es 'Invitado' o el email es inválido.",
      );
    }
  } catch (o) {
    console.error("Error en PDF o Email:", o);
    showToast(
      "Pedido guardado, pero hubo un error con el comprobante",
      "warning",
    );
  }
}

async function subirPdfACloudinary(doc, pedidoId) {
  const pdfBlob = doc.output("blob");
  const formData = new FormData();

  formData.append("file", pdfBlob, `comprobante_${pedidoId}`);
  formData.append("upload_preset", "proseinet_pdfs");
  formData.append("public_id", `comprobante_${pedidoId}`);
  formData.append("resource_type", "auto");

  const cloudName = "dei5fnqt5";
  const resp = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!resp.ok) throw new Error("Error al subir el pdf a la nube");

  const data = await resp.json();
  if (data.secure_url) {
    return data.secure_url.replace("/upload/", "/upload/fl_attachment/");
  }
  return "";
}

window.confirmarPedido = async (e, estadoPago = "Pendiente") => {
  if (e && e.preventDefault) e.preventDefault();

  const btnConfirmar = document.getElementById("btnConfirmarPedido");
  const toggleUI = (cargando) => {
    if (!btnConfirmar) return;
    btnConfirmar.disabled = cargando;
    btnConfirmar.innerHTML = cargando
      ? '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...'
      : '<i class="fas fa-check-circle me-2"></i>Confirmar Pedido';
  };

  // Validación de datos base
  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  const userId =
    localStorage.getItem("userId") ||
    (auth.currentUser ? auth.currentUser.uid : null);
  const userEmail = localStorage.getItem("userEmail");
  const userName = localStorage.getItem("nombre");

  if (!userId || carrito.length === 0) {
    showToast("Error: sesión expirada o carrito vacío", "danger");
    return;
  }

  toggleUI(true);

  const isTarjeta = document.getElementById("metodoTarjeta") ? document.getElementById("metodoTarjeta").checked : true;
  const emailFormulario = document.getElementById("emailEnvio").value || userEmail;

  const total = carrito.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  const pedido = {
    nombreUsuario: userName,
    userId,
    userEmail: emailFormulario,
    productos: carrito,
    total,
    estado: estadoPago,
    metodoEnvio: isTarjeta ? "Domicilio" : "Pago a la Entrega",
    datosEnvio: {
      nombre: document.getElementById("nombreEnvio").value,
      telefono: document.getElementById("telefonoEnvio").value,
      // Si es tarjeta guardamos dirección
      direccion: isTarjeta ? document.getElementById("direccionEnvio").value : "Solo Entrega",
      ciudad: isTarjeta ? document.getElementById("ciudadEnvio").value : "Solo Entrega",
      codigoPostal: isTarjeta ? document.getElementById("cpEnvio").value : "Solo Entrega",
      notas: isTarjeta ? document.getElementById("notasEnvio").value : "Solo Entrega",
    },
    fecha: new Date().toISOString(),
  };

  try {
    if (navigator.onLine) {
      const contadorRef = doc(db, "config", "contadores");

      const idFinal = await runTransaction(db, async (transaction) => {
        const contadorDoc = await transaction.get(contadorRef);
        if (!contadorDoc.exists()) throw "El contador de pedidos no está inicializado en Firestore";

        const nuevoNumero = contadorDoc.data().ultimoPedido + 1;
        const nomenclaturaID = `pedido-proseinet-${nuevoNumero}`;
        const pedidoRef = doc(db, "pedidos", nomenclaturaID);

        transaction.update(contadorRef, { ultimoPedido: nuevoNumero });
        transaction.set(pedidoRef, {
          ...pedido,
          id: nomenclaturaID,
          fecha: serverTimestamp(),
        });
        return nomenclaturaID;
      });

      await procesarDocumentacionPedido(pedido, idFinal);
      if (userId) await guardarTokenUsuario(userId);

      showToast(`¡Pedido ${idFinal} realizado!`, "success");
    } else {
      const idOffline = await offlineDB.guardarPedido(pedido);
      console.log("Pedido guardado localmente:", idOffline);

      if ("serviceWorker" in navigator && "SyncManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register("sync-pedidos");
      }
      showToast("Pedido guardado. Se enviará al recuperar conexión.", "warning");
    }

    finalizarProcesoPedido();
  } catch (error) {
    console.error("Error crítico en pedido:", error);
    showToast("Error al procesar el pedido: " + (error.message || error), "danger");
    toggleUI(false);
  }
};

function finalizarProcesoPedido() {
  localStorage.removeItem("carrito");
  if (typeof actualizarCarrito === "function") actualizarCarrito();

  const form = document.getElementById("checkoutForm");
  if (form) form.reset();

  const modalElem = document.getElementById("checkoutModal");
  if (modalElem) {
    const modal = bootstrap.Modal.getInstance(modalElem);
    if (modal) modal.hide();
  }

  setTimeout(() => {
    window.location.href = "/pages/pedidos.html";
  }, 2500);
}

// ABRIR CHECKOUT
window.abrirCheckout = function () {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  if (carrito.length === 0) {
    showToast("El carrito está vacío", "warning");
    return;
  }

  const userEmail = localStorage.getItem("userEmail");
  if (!userEmail) {
    showToast("Debes iniciar sesión para realizar una compra", "warning");
    setTimeout(() => {
      window.location.href = "/pages/login.html";
    }, 1000);
  }

    const resumen = document.getElementById("resumen-productos");

    const total = carrito.reduce((sum, p) => { 
        return sum + (p.precio * p.cantidad);
    }, 0);

  resumen.innerHTML = carrito.map((p) => {

        return `
        <div class="d-flex justify-content-between mb-2">
            <span>
                ${p.nombre} x ${p.cantidad} pza(s)
                ${p.esMayorista ? '<span class="badge bg-success">Precio Mayoreo</span>' : ''}
            </span>
            <span>$${(p.precio * p.cantidad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </div>
    `;

    }).join("");

  document.getElementById("total-checkout").textContent =
    "$" + total.toLocaleString("es-MX", { minimumFractionDigits: 2 });

  const emailInput = document.getElementById("emailEnvio");
  if (emailInput) emailInput.value = userEmail;
  if (typeof window.toggleMetodoCompra === "function")
    window.toggleMetodoCompra();

  const carritoModal = bootstrap.Modal.getInstance(
    document.getElementById("carritoModal"),
  );
  if (carritoModal) carritoModal.hide();

  const checkoutModal = new bootstrap.Modal(
    document.getElementById("checkoutModal"),
  );
  checkoutModal.show();
};

async function reducirStock(productos) {
  try {
    await runTransaction(db, async (transaction) => {
      for (const item of productos) {
        const productoRef = doc(db, "productos", item.id);
        const productoDoc = await transaction.get(productoRef);

        if (!productoDoc.exists()) {
          throw `El producto ${item.nombre} no existe.`;
        }

        const nuevoStock = productoDoc.data().stock - item.cantidad;

        if (nuevoStock < 0) {
          throw `Stock insuficiente para ${item.nombre}.`;
        }

        transaction.update(productoRef, { stock: nuevoStock });
      }
    });
    console.log("Stock actualizado correctamente");
  } catch (error) {
    console.error("Error al actualizar el stock: ", error);
    throw error;
  }
}
