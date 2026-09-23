export function setupCurrentLocation(map, L) {
 const locateButton=document.querySelector('#map-locate');
 const stopButton=document.querySelector('#map-locate-stop');
 const status=document.querySelector('#map-location-status');
 let watchId=null,position=null,marker=null,accuracyCircle=null,request=0;

 const setStatus=message=>{status.textContent=message;status.hidden=!message;};
 const clearPosition=()=>{
  if(marker)map.removeLayer(marker);
  if(accuracyCircle)map.removeLayer(accuracyCircle);
  marker=null;accuracyCircle=null;position=null;
 };
 const stop=()=>{
  request++;
  if(watchId!==null)navigator.geolocation.clearWatch(watchId);
  watchId=null;
  clearPosition();
  locateButton.disabled=false;
  locateButton.textContent='◎ 目前位置';
  stopButton.hidden=true;
  setStatus('');
 };
 const fail=error=>{
  stop();
  setStatus(error?.code===1?'無法取得位置：請允許瀏覽器使用定位。':error?.code===3?'定位逾時，請再試一次。':'無法取得目前位置，請確認裝置的定位設定。');
 };
 const update=geoPosition=>{
  const {latitude,longitude,accuracy}=geoPosition.coords;
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)){fail();return;}
  const latlng=[latitude,longitude];
  const firstFix=!position;
  position=latlng;
  if(!marker){
   marker=L.circleMarker(latlng,{radius:9,color:'#fff',weight:3,fillColor:'#087f8c',fillOpacity:1}).bindPopup('目前位置').addTo(map);
  }else marker.setLatLng(latlng);
  if(Number.isFinite(accuracy)&&accuracy>0){
   if(!accuracyCircle)accuracyCircle=L.circle(latlng,{radius:accuracy,color:'#087f8c',weight:1,opacity:.55,fillColor:'#087f8c',fillOpacity:.1,interactive:false}).addTo(map);
   else accuracyCircle.setLatLng(latlng).setRadius(accuracy);
  }else if(accuracyCircle){map.removeLayer(accuracyCircle);accuracyCircle=null;}
  marker.bringToFront();
  locateButton.disabled=false;
  locateButton.textContent='◎ 回到目前位置';
  setStatus('位置持續更新中');
  if(firstFix)map.flyTo(latlng,Math.max(map.getZoom(),14),{duration:.6});
 };

 locateButton.addEventListener('click',()=>{
  if(position){map.flyTo(position,Math.max(map.getZoom(),14),{duration:.6});return;}
  if(!isSecureContext||!navigator.geolocation){setStatus('定位需要 HTTPS 與支援定位的瀏覽器。');return;}
  locateButton.disabled=true;
  locateButton.textContent='取得位置中…';
  stopButton.hidden=false;
  setStatus('正在取得目前位置…');
  const currentRequest=++request;
  try{
   watchId=navigator.geolocation.watchPosition(
    result=>{if(currentRequest===request)update(result);},
    error=>{if(currentRequest===request)fail(error);},
    {enableHighAccuracy:true,maximumAge:10000,timeout:15000}
   );
  }catch{if(currentRequest===request)fail();}
 });
 stopButton.addEventListener('click',stop);
 addEventListener('pagehide',stop);
}
