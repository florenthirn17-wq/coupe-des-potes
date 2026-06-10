// Firebase storage adapter for "La Coupe des Potes".
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
}

const HAS_CONFIG = !!firebaseConfig.apiKey && !!firebaseConfig.projectId
let db = null
if (HAS_CONFIG) {
  try { db = getFirestore(initializeApp(firebaseConfig)) } catch(e) { console.error('Firebase init failed', e) }
}

const local = {
  get: (k) => { try { return JSON.parse(localStorage.getItem('cdp26:'+k)) } catch { return null } },
  set: (k,v) => { try { localStorage.setItem('cdp26:'+k, JSON.stringify(v)) } catch {} },
  list: (prefix) => {
    const out = []
    for (let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i)
      if(key && key.startsWith('cdp26:'+prefix)) out.push(key.replace('cdp26:',''))
    }
    return out
  }
}

// Firestore interdit ':' '/' '.' '#' '$' '[' ']' dans les IDs de doc.
// On encode/décode pour garder la clé d'origine côté app.
const ENC = (k) => k.replace(/:/g,'__').replace(/[\/\.\#\$\[\]]/g,'_')
const DEC = (k) => k.replace(/__/g, ':')

export const isShared = !!db

export async function sGet(key){
  if(!db) return local.get(key)
  try {
    const snap = await getDoc(doc(db, 'cdp26', ENC(key)))
    return snap.exists() ? snap.data().value : null
  } catch(e){ console.warn('sGet fallback', e); return local.get(key) }
}
export async function sSet(key, value){
  local.set(key, value)
  if(!db) return
  try { await setDoc(doc(db, 'cdp26', ENC(key)), { value, updatedAt: Date.now() }) }
  catch(e){ console.warn('sSet fallback', e) }
}
export async function listPlayerKeys(){
  if(!db) return local.list('p1:')
  try {
    const snap = await getDocs(collection(db, 'cdp26'))
    const keys = []
    snap.forEach(d => {
      const decoded = DEC(d.id)
      if(decoded.startsWith('p1:')) keys.push(decoded)
    })
    return keys
  } catch(e){ console.warn('list fallback', e); return local.list('p1:') }
}
