# TOCPLAY — PLAYORA

PWA mobile-first para descobrir filmes, desenhos, documentários e vídeos públicos em fontes autorizadas.

## Estado inicial

- Interface responsiva em português.
- Categorias e pesquisa.
- API serverless em `/api/search` consultando o catálogo público do Internet Archive.
- Manifesto e service worker para instalação e cache leve do shell.
- GitHub Actions valida os arquivos e a sintaxe.
- Categoria Facebook com aviso explícito: não simula uma busca geral que a API oficial da Meta não oferece.

## Arquitetura

- **Frontend:** HTML, CSS e JavaScript sem framework, para manter o projeto leve.
- **Backend:** Vercel Function em `api/search.js`.
- **Fonte inicial:** Internet Archive Advanced Search API.
- **CI:** GitHub Actions.
- **Próxima etapa:** adicionar conectores de fontes, validação de direitos/licenças e player incorporado quando a origem permitir.

## Executar localmente

É necessário um runtime Node.js e a CLI da Vercel para testar a rota serverless:

```bash
npm i -g vercel
vercel dev
```

Abra o endereço local informado pela CLI. O frontend pode ser servido estaticamente, mas a busca depende da função `/api/search`.

## Deploy na Vercel

Importe `detiillimichel-max/TOCPLAY` na Vercel e mantenha o diretório raiz como `.`. Não são necessárias chaves para a busca inicial do Internet Archive.

## Limites conhecidos

- A Meta não fornece uma busca pública geral irrestrita para descobrir todos os vídeos do Facebook. A categoria Facebook fica transparente até haver uma fonte oficial de descoberta viável; URLs públicas compatíveis poderão ser incorporadas depois.
- Encontrar um item público não significa que ele esteja em domínio público ou liberado para redistribuição. O catálogo deve respeitar os direitos e as condições indicadas na página de cada item.
- A primeira versão abre a página da fonte original. A reprodução incorporada será adicionada apenas para formatos e fontes compatíveis.
- O cache do service worker é limitado aos arquivos da interface; as respostas da API são gerenciadas separadamente.

## Segurança

Não colocar tokens, chaves privadas ou segredos no frontend, neste repositório ou em arquivos estáticos. Se uma fonte futura exigir credenciais, elas devem ficar em variáveis de ambiente do backend.
