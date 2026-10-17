// Audio and draft transcripts deliberately never enter localStorage/IndexedDB.
const MAX_BYTES=1048576;
const ACTIVE=new Set(['requesting','recording','processing']);
export function createVoiceCapture({onChange,send,onTick=()=>{}}){
  let current={phase:'idle',text:'',error:'',seconds:0},generation=0,stream,recorder,controller,interval,deadline;
  const supported=()=>!!(globalThis.isSecureContext&&navigator.mediaDevices?.getUserMedia&&globalThis.MediaRecorder);
  const publish=patch=>{current={...current,...patch};onChange();};
  function cleanup(){clearInterval(interval);clearTimeout(deadline);stream?.getTracks().forEach(track=>track.stop());stream=null;}
  function reset(){generation++;cleanup();if(recorder?.state==='recording')recorder.stop();recorder=null;controller?.abort();controller=null;current={phase:'idle',text:'',error:'',seconds:0};}
  function fail(message,token){if(token!==generation)return;reset();publish({phase:'error',error:message});}
  async function start(){
    if(ACTIVE.has(current.phase))return;
    reset();const token=generation;
    if(!supported()){publish({phase:'error',error:'Browser ini belum mendukung rekaman. Buka lewat localhost di Chrome atau Edge, atau ketik pesanan.'});return;}
    publish({phase:'requesting'});
    try{
      const incoming=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      if(token!==generation){incoming.getTracks().forEach(track=>track.stop());return;}
      stream=incoming;
      const mimeType=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
      if(!mimeType)throw new Error('format');
      recorder=new MediaRecorder(stream,{mimeType,audioBitsPerSecond:64000});
      const parts=[];let bytes=0;
      recorder.ondataavailable=event=>{if(token!==generation||!event.data.size)return;bytes+=event.data.size;if(bytes>MAX_BYTES){fail('Rekaman terlalu besar. Rekam lebih singkat atau ketik pesanan.',token);return;}parts.push(event.data);};
      recorder.onerror=()=>fail('Mikrofon terputus. Rekam ulang atau ketik pesanan.',token);
      stream.getTracks().forEach(track=>track.addEventListener('ended',()=>{if(token===generation&&current.phase==='recording')fail('Mikrofon terputus. Rekam ulang atau ketik pesanan.',token);},{once:true}));
      recorder.onstop=async()=>{
        if(token!==generation)return;cleanup();
        if(!bytes){fail('Rekaman masih kosong. Ucapkan pesanan lalu hentikan rekaman.',token);return;}
        publish({phase:'processing'});controller=new AbortController();
        try{
          const data=new Uint8Array(await new Blob(parts,{type:mimeType}).arrayBuffer());
          if(token!==generation)return;
          let binary='';for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));
          const result=await send({audio:btoa(binary),mimeType},controller.signal);
          if(token!==generation)return;
          if(typeof result.text!=='string'||!result.text.trim()||result.text.length>2000)throw new Error('Hasil suara tidak valid. Rekam ulang atau ketik pesanan.');
          publish({phase:'review',text:result.text,error:''});
        }catch(error){if(token===generation)fail(error.message||'Suara belum dapat diproses. Ketik pesanan atau coba lagi.',token);}
      };
      recorder.start(250);publish({phase:'recording',seconds:0});const started=Date.now();
      interval=setInterval(()=>{current.seconds=Math.min(28,Math.floor((Date.now()-started)/1000));onTick(current.seconds);},250);
      // Leave room for encoder padding under the server's strict 30-second bound.
      deadline=setTimeout(stop,28000);
    }catch(error){fail(error.name==='NotAllowedError'?'Izin mikrofon belum diberikan. Izinkan lewat pengaturan browser atau ketik pesanan.':error.name==='NotFoundError'?'Mikrofon tidak ditemukan. Hubungkan mikrofon atau ketik pesanan.':'Mikrofon belum bisa dipakai. Periksa perangkat atau ketik pesanan.',token);}
  }
  function stop(){if(current.phase!=='recording')return;clearInterval(interval);clearTimeout(deadline);current.phase='processing';recorder.stop();cleanup();onChange();}
  return {start,stop,reset,cancel(){reset();onChange();},get active(){return ACTIVE.has(current.phase);},get state(){return {...current,supported:supported()};},edit(text){current.text=text;}};
}
