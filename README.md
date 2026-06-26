# Rede Social estilo Twitter

Este projeto é uma rede social simples inspirada no Twitter antigo. Eu cuidei do backend em Express + SQLite, e minha dupla trabalha no frontend em React.

## Estrutura do projeto

- `back-end/` — API em Express com SQLite para autenticação, posts e favoritos.
- `rede-social/` — frontend React que consome as APIs do backend.

## Funcionalidades implementadas no backend

- Cadastro de usuário com senha armazenada em hash seguro.
- Login com geração de token de sessão.
- Logout removendo a sessão ativa.
- Listagem de posts visível para usuários logados e não logados.
- Criação de post para usuários logados.
- Curtir/descurtir posts usando tabela `favorites`.
- Endpoint de perfil `GET /api/me` para consultar o usuário autenticado.

## Banco de dados

O backend usa SQLite e cria automaticamente o arquivo `back-end/database.sqlite` com as tabelas:

- `users`
- `posts`
- `favorites`
- `sessions`

## Como rodar o backend

No terminal:

```bash
cd back-end
npm install
node index.js
```

O servidor ficará disponível em `http://localhost:4000`.

### Rotas principais do backend

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/posts`
- `POST /api/posts`
- `POST /api/posts/:postId/favorite`
- `DELETE /api/posts/:postId/favorite`
- `GET /api/me`

### Autenticação

O frontend deve enviar o token no cabeçalho `Authorization`:

```
Authorization: Bearer <token>
```

## Como rodar o frontend

No terminal:

```bash
cd rede-social
npm install
npm run dev
```

O frontend será servido pela Vite e pode ser acessado no endereço mostrado no terminal.

## Minha parte no projeto

Eu desenvolvi o backend e garanti que todas as funcionalidades obrigatórias da prova estejam atendidas: autenticação segura, gerenciamento de posts e favoritos, e suporte a usuários logados e não logados.

## Observações

- O backend permite requests de qualquer origem com CORS para facilitar a integração com o frontend.
- O arquivo `database.sqlite` está incluído no `.gitignore` para não ser versionado.

## Próximos passos

- Minha dupla pode terminar o frontend usando as rotas acima.
- Podemos adicionar a pasta `prompts/` com exemplos das mensagens usadas para pedir ajuda à IA.
- Depois, faremos o deploy e a apresentação.
