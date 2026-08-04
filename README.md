# Passkey & Agent POC

Duas provas de conceito na mesma tela:

- **Login** por código no email (VTEX) e por **chave de acesso** (WebAuthn).
- **Agente**: um chat plugável, pronto para receber um backend real.

Stack: React 19 + Vite + TypeScript, **Jotai** (estado), **@tanstack/react-query**
+ **graphql-request** (rede), Tailwind v4, framer-motion.

---

## ⚠️ O dev server NÃO funciona em `localhost`

Rodar em `http://localhost:5173` quebra os dois fluxos, por dois motivos
independentes:

**1. O cookie de sessão não volta.**
O gateway responde ao `sendEmailVerification` com:

```
set-cookie: VtexSessionToken=...; Max-Age=600; Path=/; HttpOnly; Secure
```

Sem `SameSite=None`, o Chrome trata como `SameSite=Lax`, e cookie Lax **não é
enviado em requisição cross-site**. De `localhost` para `api-gateway.cvlb.tech`
o request é cross-site, então o `accessKeySignIn` seguinte falha com
`VtexSessionToken cookie is null`.

(Compare com o `VtexWorkspace`, que tem `SameSite=None` e é enviado normalmente.)

**2. O rpID da passkey não bate.**
`passkeyLoginOptions` retorna `rpId: "pass.cvlb.tech"`. O WebAuthn exige que a
origem da página seja esse domínio ou um subdomínio dele — `localhost` é
recusado pelo navegador antes de qualquer chamada.

### Solução: servir de um host sob `pass.cvlb.tech`

```bash
yarn hosts   # confere /etc/hosts e adiciona a entrada se faltar (pede sudo)
yarn dev
```

Depois abra **https://local.pass.cvlb.tech:5173** (não `localhost`).

O `yarn hosts` é idempotente: se a entrada já existe, ele só confirma e sai.

Isso resolve os dois de uma vez: a chamada vira same-site (o cookie Lax
round-trippa) e `local.pass.cvlb.tech` é subdomínio de `pass.cvlb.tech` (o rpID
confere).

O HTTPS é obrigatório — o cookie é `Secure` e o WebAuthn exige contexto seguro
fora de `localhost`. O certificado é auto-assinado (`@vitejs/plugin-basic-ssl`),
então aceite o aviso do navegador na primeira visita.

Em produção nada disso é necessário: o deploy vai para `pass.cvlb.tech`
(gh-pages → `formigteen.github.io`), que já é same-site e já casa com o rpID.

---

## Endpoints

| Módulo | URL | Operações |
|---|---|---|
| `ecom` | `/gql/v1/ecom` | `sendEmailVerification`, `accessKeySignIn` |
| `core` | `/gql/v1/core` | `getProfile`, passkey (ver abaixo) |

O `core` é o app `gq_example` do repo `l-gcp-core`. As operações de passkey
foram renomeadas:

| Antes | Agora |
|---|---|
| `registerPasskeyOptions` | `passkeyRegisterOptions` |
| `loginPasskeyOptions` | `passkeyLoginOptions` |
| `registerPasskey` | `passkeyRegister` |
| `loginPasskey` | `passkeyLogin` → `PasskeyToken { email token }` |

## Duas sessões diferentes

Isto não é detalhe de implementação, muda o que a UI pode fazer:

- **Login por código** → o gateway seta o cookie. `getProfile` responde, e é
  possível **registrar** passkey (`passkeyRegisterOptions` resolve o usuário via
  `tryIsAuth`).
- **Login por passkey** → devolve um **token custom do Firebase** e **não seta
  cookie**. A sessão é client-side; `getProfile` continua anônimo e o registro
  de nova passkey não é possível até logar por código.

Por isso o card de registro automático só aparece quando `getProfile` retorna
email.

## Fluxos

**Usuário recorrente (`useAutoPasskeyLogin`)** — via **mediação condicional**:
a passkey aparece na lista de autofill do campo de email, e só se o navegador
realmente tiver uma. Nada é disparado por conta própria.

Isso não é detalhe de implementação. Não existe API para perguntar "este
aparelho tem a credencial X?" — enumerar credenciais seria fingerprinting — e o
gateway responde pela **conta**, não pelo aparelho. Um celular pode não ter nada
enquanto a chave da conta está no notebook. Manter esse palpite no storage foi a
origem de todos os bugs desta área: modal abrindo sozinho, QR no desktop,
"nenhuma chave disponível" ao sair. A mediação condicional entrega a decisão a
quem consegue tomá-la, e o modo de falha vira silêncio.

**O `Continuar` vai direto para o código.** A chave nunca passa por ele: um
prompt modal ofereceria *todas* as credenciais que o aparelho guarda para o
relying party — as opções de login não trazem mais lista de credenciais, de
propósito — então quem digita um email sem chave veria a de outra conta,
escolheria, e o servidor recusaria com razão.

**Registro (`usePasskeyEnrolment`)** — o card só aparece quando a conta não tem
**nenhuma** chave, e isso vem do `excludeCredentials` do
`passkeyRegisterOptions` — autenticado e sobre a própria conta, então não
reabre o oráculo que o login fechou. O sensor só abre no "Sim, registrar". Se o aparelho já alcança uma chave da conta, o servidor recusa
via `excludeCredentials` — único momento em que o navegador revela isso — e o
resultado fica gravado em `passkey-poc:device-enrolled`.

Gravar **esse** dado é seguro, e a diferença importa: ele só **esconde a
oferta**, nunca autoriza um prompt. Errar custa um card que não apareceu, não
uma tela do SO falhando.

**Sair** — a mutation `signOut` do módulo `globals` expira os cookies
`VtexIdclientAutCookie*` do lado do servidor.

Tem que ser no servidor. O cookie volta como

```
VtexIdclientAutCookie_lebiscuit   domain=api-gateway.cvlb.tech   httpOnly=true
```

`httpOnly` o tira do alcance do `document.cookie`, e mesmo sem isso uma página
só escreve cookie para o próprio host ou para um domínio **pai** — nunca para um
**irmão** como `api-gateway.cvlb.tech`. Testado também sombrear com um cookie de
mesmo nome em `.cvlb.tech`: o host-only vem primeiro no header e vence. Só quem
escreveu o cookie consegue retirá-lo.

Sair encerra junto a sessão do **Firebase**, que vive em IndexedDB e
sobreviveria ao logout deixando `auth.currentUser` para o próximo visitante.

## Onde plugar o agente

`src/agent/agent.ts` → `askAgent()`. É o único ponto de contato: transcript,
placeholder de digitação, erro e composer já funcionam em volta dele.

## Estado persistido (Jotai)

| Chave | Uso |
|---|---|
| `passkey-poc:last-email` | preenche o form e alimenta a mediação condicional |
| `passkey-poc:device-enrolled` | aparelho já alcança a chave — só esconde a oferta |
| `passkey-poc:enrol-dismissed` | quem recusou o registro |

## Scripts

```bash
yarn hosts    # garante 127.0.0.1 local.pass.cvlb.tech em /etc/hosts
yarn dev      # https://local.pass.cvlb.tech:5173
yarn build    # tsc -b && vite build
yarn deploy   # gh-pages -d dist  → pass.cvlb.tech
```
