# La Coupe des Potes — Mondial 2026

Pronostics du Mondial 2026 entre potes.

## Déploiement en 3 étapes (15 min)

### 1. Crée une base Firebase (gratuit, 5 min)

1. Va sur https://console.firebase.google.com
2. Clique **"Ajouter un projet"** → nomme-le `coupe-des-potes` → ignore Google Analytics → crée.
3. Une fois créé, clique sur l'icône **`</>`** (Web) au centre de la page d'accueil du projet.
4. Donne un surnom à l'app (ex. "web") → **enregistre** (pas besoin de cocher Firebase Hosting) → tu vois apparaître un bloc de config `firebaseConfig = { apiKey: "...", ... }`. **Garde cette page ouverte**, on en a besoin à l'étape 3.
5. Dans le menu de gauche : **Build → Firestore Database** → **Créer une base** → mode **production** → région **europe-west** (ou autre proche) → activer.
6. Onglet **"Règles"** : remplace tout le contenu par ce qui suit, puis clique **Publier** :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cdp26/{doc} {
      allow read, write: if true;
    }
  }
}
```

(Pas de mot de passe entre potes — n'importe qui avec le lien peut lire/écrire. C'est ce qu'on voulait.)

### 2. Pousse le code sur GitHub (5 min)

1. Crée un compte sur https://github.com si tu n'en as pas.
2. Crée un **nouveau dépôt** (bouton vert "New") → nom : `coupe-des-potes` → **Public** → crée (sans README).
3. Dans le dossier du projet, ouvre un terminal et tape :

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/coupe-des-potes.git
git push -u origin main
```

Si tu n'as jamais utilisé Git, tu peux aussi simplement **glisser-déposer tous les fichiers** dans l'interface web du dépôt (bouton "uploading an existing file").

### 3. Déploie sur Vercel (5 min)

1. Va sur https://vercel.com → connecte-toi avec ton compte GitHub.
2. Clique **"Add New → Project"** → choisis le dépôt `coupe-des-potes` → **Import**.
3. Dans **Environment Variables**, ajoute les 6 variables suivantes (les valeurs viennent de la config Firebase de l'étape 1.4) :

| Variable | Valeur |
|---|---|
| `VITE_FB_API_KEY` | `apiKey` de Firebase |
| `VITE_FB_AUTH_DOMAIN` | `authDomain` |
| `VITE_FB_PROJECT_ID` | `projectId` |
| `VITE_FB_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FB_SENDER_ID` | `messagingSenderId` |
| `VITE_FB_APP_ID` | `appId` |

4. Clique **Deploy** → attends 1 minute → tu obtiens un lien type `https://coupe-des-potes.vercel.app`.

**C'est ce lien que tu partages à tes potes !** ✅

---

## Comment ça marche pour vous

- Chaque joueur ouvre le lien, tape son prénom, et ses pronos sont enregistrés à son nom.
- Pas de mot de passe : reprendre le même prénom = retrouver ses pronos.
- L'espace **Organisateur** (menu en bas à droite) sert à saisir les vrais résultats du Mondial au fil des matchs.
- Les classements se mettent à jour automatiquement.

## Développement local (optionnel)

```bash
cp .env.example .env.local
# remplis tes vraies valeurs Firebase dans .env.local
npm install
npm run dev
```
