<p align="center">
  <img src="docs/assets/logo.svg" alt="Product Explorer" width="360">
</p>

<p align="center"><strong>Catálogo de productos fullstack: buscar, filtrar y ordenar una lista, y abrir cada producto, sobre nuestra propia API y base de datos.</strong></p>

<p align="center">
  <a href="https://github.com/mtombolini/product-explorer/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/mtombolini/product-explorer/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="React 19" src="https://img.shields.io/badge/react-19-0058A3?logo=react&logoColor=white">
  <img alt="TypeScript 6" src="https://img.shields.io/badge/typescript-6-0058A3?logo=typescript&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/fastapi-0.143-0058A3?logo=fastapi&logoColor=white">
  <img alt="Python 3.13" src="https://img.shields.io/badge/python-3.13-0058A3?logo=python&logoColor=white">
  <img alt="PostgreSQL 17" src="https://img.shields.io/badge/postgresql-17-0058A3?logo=postgresql&logoColor=white">
  <img alt="Docker Compose" src="https://img.shields.io/badge/docker-compose-0058A3?logo=docker&logoColor=white">
</p>

<p align="center"><a href="README.md">English</a> | <strong>Español</strong></p>

---

> Este archivo es un resumen. La documentación completa está en inglés en
> [README.md](README.md).

## Propósito

Product Explorer es un catálogo pequeño: una lista paginada con búsqueda,
filtro por categoría y orden por precio, y una página por producto. El
frontend en React habla solo con nuestra API REST, que sirve datos
importados una vez desde [Fake Store API](https://fakestoreapi.com) a
PostgreSQL.

## Stack

| | |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Redux Toolkit, MUI, i18next |
| Backend | Python 3.13, FastAPI, SQLAlchemy 2, Alembic, Pydantic |
| Base de datos | PostgreSQL 17 |
| Ejecución | Docker Compose: `frontend` (Nginx), `backend`, `db` |

## Inicio rápido

Requisitos: Docker con Compose v2, los puertos 8080 y 8000 libres e
internet en el primer arranque.

```bash
git clone https://github.com/mtombolini/product-explorer.git
cd product-explorer
docker compose up --build
```

No hace falta un archivo `.env`. El primer arranque importa 20 productos
con sus imágenes y tarda cerca de un minuto.

| Qué | Dirección |
| --- | --- |
| Aplicación | <http://localhost:8080> |
| Documentación de la API (Swagger UI) | <http://localhost:8000/docs> |
| Estado | <http://localhost:8000/health> |

```bash
docker compose down        # detener y conservar los datos
docker compose down -v     # detener y borrar los datos
```

## API

| Método y ruta | Qué devuelve |
| --- | --- |
| `GET /api/products` | Una página de productos. Parámetros: `page`, `page_size`, `search`, `category`, `min_price`, `max_price`, `sort`, `lang` |
| `GET /api/products/{id}` | Un producto. Parámetro: `lang` |
| `GET /api/categories` | Las categorías |
| `GET /health` | Estado de la API y de la base de datos |

Los errores tienen siempre la misma forma:
`{"error": {"code", "message", "details"}}`.

## Tests

```bash
# Backend: 133 tests (pytest) contra PostgreSQL
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm --build backend-test

# Frontend: 78 tests (Vitest + React Testing Library)
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm --build frontend-test
```

## Idiomas

La interfaz está en inglés y español. La primera visita usa el idioma del
navegador si es uno de los dos. Los títulos, las descripciones y las
especificaciones del catálogo también están en ambos idiomas: Fake Store
solo tiene inglés, así que el texto en español se escribió para este
proyecto (con IA) y se guarda en nuestra base de datos.

## Más documentos

Todos en inglés:

- [README.md](README.md): arquitectura, importación, accesibilidad,
  supuestos y limitaciones.
- [docs/SPEC.md](docs/SPEC.md): requisitos y contrato de diseño.
- [docs/DECISIONS.md](docs/DECISIONS.md): decisiones y sus alternativas.
- [docs/architecture.md](docs/architecture.md): diagramas.
- [AI_USAGE.md](AI_USAGE.md): cómo se usó la IA.
- [FUTURE_IMPROVEMENTS.md](FUTURE_IMPROVEMENTS.md): mejoras pendientes.
