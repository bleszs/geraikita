const button=document.querySelector('#recover'),status=document.querySelector('#status');
button.addEventListener('click',async()=>{
  button.disabled=true;status.textContent='Mengambil versi aplikasi terbaru…';
  try{
    const response=await fetch('/api/health',{cache:'no-store'});
    if(!response.ok)throw new Error('Server belum siap. Jalankan npm start, lalu coba lagi.');
    if('serviceWorker' in navigator){
      const registrations=await navigator.serviceWorker.getRegistrations();
      for(const registration of registrations)if(registration.scope===location.origin+'/')await registration.unregister();
    }
    if('caches' in window)for(const name of await caches.keys())if(name.startsWith('gerai-kita-shell-'))await caches.delete(name);
    // IndexedDB and cookies contain user data and are deliberately preserved.
    location.replace('/');
  }catch(error){status.textContent=error.message || 'Pembaruan belum berhasil. Coba lagi.';button.disabled=false;}
});
