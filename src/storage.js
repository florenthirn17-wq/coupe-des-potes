// Firebase storage adapter for "La Coupe des Potes".
// Tous les pronos sont stockés dans une seule collection Firestore "cdp26",
// et tous les joueurs voient les mêmes données.
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

// Local fallback (single-device) si Firebase n'est pas configuré
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

const SAFE = (k) => k.replace(/[\/\.\#\$\[\]]/g,'_')

export const isShared = !!db

export async function sGet(key){
  if(!db) return local.get(key)
  try {
    const snap = await getDoc(doc(db, 'cdp26', SAFE(key)))
    return snap.exists() ? snap.data().value : null
  } catch(e){ console.warn('sGet fallback', e); return local.get(key) }
}
export async function sSet(key, value){
  local.set(key, value)
  if(!db) return
  try { await setDoc(doc(db, 'cdp26', SAFE(key)), { value, updatedAt: Date.now() }) }
  catch(e){ console.warn('sSet fallback', e) }
}
export async function listPlayerKeys(){
  if(!db) return local.list('p1:')
  try {
    const snap = await getDocs(collection(db, 'cdp26'))
    const keys = []
    snap.forEach(d => { if(d.id.startsWith('p1_')) keys.push(d.id.replace(/^p1_/, 'p1:')) })
    return keys
  } catch(e){ console.warn('list fallback', e); return local.list('p1:') }
}
