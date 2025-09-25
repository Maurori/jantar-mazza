let tipoUsuario = null;
const dataBruta = document.getElementById("data").value;
const partes = dataBruta.split("-");
const data = `${partes[2]}-${partes[1]}-${partes[0]}`; // dd-mm-aa

function entrar() {
  const tipo = document.getElementById("userType").value;
  document.getElementById("login").style.display = "none";

  if (tipo === "master") {
    document.getElementById("cadastro").style.display = "block";
    mostrarItens("listaCadastro");
  } else {
    document.getElementById("visualizacao").style.display = "block";
    mostrarItens("listaVisualizacao");
  }
}
function mostrarCampoSenha() {
  const tipo = document.getElementById("userType").value;
  const senhaDiv = document.getElementById("senhaDiv");
  senhaDiv.style.display = tipo === "master" ? "block" : "none";
}

function entrar() {
  tipoUsuario = document.getElementById("userType").value;
  const senha = document.getElementById("senha").value;

  if (tipoUsuario === "master") {
    if (senha !== "tricolor") {
      alert("Senha incorreta!");
      return;
    }
    document.getElementById("cadastro").style.display = "block";
    mostrarItens("listaCadastro");
  } else {
    document.getElementById("visualizacao").style.display = "block";
    mostrarItens("listaVisualizacao");
  }

  document.getElementById("login").style.display = "none";
}

function adicionarItem() {
  const item = document.getElementById("item").value.trim();
  const dataBruta = document.getElementById("data").value;
  const partes = dataBruta.split("-");
  const data = `${partes[2]}-${partes[1]}-${partes[0]}`; // dd-mm-aa


  if (item && data) {
    let itens = JSON.parse(localStorage.getItem("jantar")) || [];
    itens.push({ item, data });
    localStorage.setItem("jantar", JSON.stringify(itens));
    document.getElementById("item").value = "";
    document.getElementById("data").value = "";
    mostrarItens("listaCadastro");
  }
}

function mostrarItens(listaId) {
  const lista = document.getElementById(listaId);
  lista.innerHTML = "";
  const itens = JSON.parse(localStorage.getItem("jantar")) || [];

  itens.forEach((entrada, index) => {
    const li = document.createElement("li");
    let conteudo = `<span>${entrada.data} — ${entrada.item}</span>`;

    if (tipoUsuario === "master") {
      conteudo += ` <button class="delete-btn" onclick="excluirItem(${index})">🗑️</button>`;
    }

    li.innerHTML = conteudo;
    lista.appendChild(li);
  });
}
function excluirItem(index) {
  let itens = JSON.parse(localStorage.getItem("jantar")) || [];
  itens.splice(index, 1);
  localStorage.setItem("jantar", JSON.stringify(itens));
  mostrarItens("listaCadastro");
  mostrarItens("listaVisualizacao");
}