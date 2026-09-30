import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, MapPinOff } from 'lucide-react';
import courierDelivery8Dir from '../../assets/tracking/courier-delivery-8dir.jpg';
import type { CourierRoutePoint } from '../Courier/domain/courierLocation';
import { getCourierDirectionIndex, getCourierSpriteFrame, resolveCourierHeading } from './customerTrackingMap';
import * as S from './CustomerDeliveryMap.styles';

type Destination = CourierRoutePoint & { label?: string };
type LatLng = { lat: number; lng: number };
type GoogleLatLngBounds = { extend(position: LatLng): void; contains(position: LatLng): boolean };
type GoogleMapInstance = { getBounds(): GoogleLatLngBounds | undefined; panTo(position: LatLng): void; fitBounds(bounds: GoogleLatLngBounds, padding: Record<string, number>): void };
type GoogleMarkerInstance = { setPosition(position: LatLng): void; setIcon(icon: Record<string, unknown>): void };
type GooglePolylineInstance = { setPath(path: LatLng[]): void };
type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  Polyline: new (options: Record<string, unknown>) => GooglePolylineInstance;
  LatLngBounds: new () => GoogleLatLngBounds;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
};

declare global { interface Window { __gastronexaGoogleMapsPromise?: Promise<GoogleMapsApi>; } }

const GOOGLE_MAPS_SCRIPT_ID='gastronexa-google-maps';
const DEFAULT_CENTER={lat:-3.7319,lng:-38.5267};
const FRAME_W=88, FRAME_H=99;
function loadedMaps(){return (window.google as {maps?:GoogleMapsApi}|undefined)?.maps;}
function loadGoogleMaps(){
  const apiKey=String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY||'').trim();
  if(!apiKey) return Promise.reject(new Error('Google Maps ainda não foi configurado neste ambiente.'));
  const loaded=loadedMaps(); if(loaded) return Promise.resolve(loaded);
  if(window.__gastronexaGoogleMapsPromise) return window.__gastronexaGoogleMapsPromise;
  window.__gastronexaGoogleMapsPromise=new Promise((resolve,reject)=>{
    const existing=document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement|null;
    if (existing) {
      existing.addEventListener('load', () => {
        const maps = loadedMaps();
        if (maps) resolve(maps);
        else reject(new Error('Google Maps não ficou disponível após o carregamento.'));
      });
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Maps.')));
      return;
    }
    const script=document.createElement('script'); script.id=GOOGLE_MAPS_SCRIPT_ID; script.async=true; script.defer=true;
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.onload = () => {
      const maps = loadedMaps();
      if (maps) resolve(maps);
      else reject(new Error('Google Maps não ficou disponível após o carregamento.'));
    };
    script.onerror = () => reject(new Error('Falha ao carregar Google Maps.'));
    document.head.appendChild(script);
  });
  return window.__gastronexaGoogleMapsPromise;
}
function dist(a:CourierRoutePoint,b:CourierRoutePoint){const x=a.latitude-b.latitude,y=a.longitude-b.longitude;return x*x+y*y;}
function remainingRoute(route:CourierRoutePoint[],latest:CourierRoutePoint){if(route.length<2)return route;let n=0,d=Infinity;route.forEach((p,i)=>{const v=dist(p,latest);if(v<d){d=v;n=i;}});const rest=route.slice(n).filter(p=>dist(p,latest)>1e-8);return rest.length?[latest,...rest]:[latest,route.at(-1)!];}
const ll=(p:CourierRoutePoint)=>({lat:p.latitude,lng:p.longitude});
function destinationSvg(){const svg='<svg xmlns="http://www.w3.org/2000/svg" width="54" height="64" viewBox="0 0 54 64"><path d="M27 3C14.9 3 5 12.8 5 25c0 16.4 22 36 22 36s22-19.6 22-36C49 12.8 39.1 3 27 3z" fill="#e96725" stroke="#fff" stroke-width="3"/><circle cx="27" cy="25" r="8" fill="#fff"/></svg>';return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;}
function courierIcon(maps:GoogleMapsApi,index:number){const f=getCourierSpriteFrame(index);return {url:courierDelivery8Dir,size:new maps.Size(FRAME_W,FRAME_H),origin:new maps.Point(f.column*FRAME_W,f.row*FRAME_H),anchor:new maps.Point(FRAME_W/2,FRAME_H*.88),scaledSize:new maps.Size(FRAME_W*4,FRAME_H*2)};}

export default function CustomerDeliveryMap({points,routePath=[],destination,etaMinutes,distanceMeters,courierName='Motoqueiro',isTerminal=false}:{points:CourierRoutePoint[];routePath?:CourierRoutePoint[];destination?:Destination;etaMinutes?:number|null;distanceMeters?:number|null;courierName?:string;isTerminal?:boolean;}){
  const ref=useRef<HTMLDivElement|null>(null), map=useRef<GoogleMapInstance|null>(null), bike=useRef<GoogleMarkerInstance|null>(null), dest=useRef<GoogleMarkerInstance|null>(null), outline=useRef<GooglePolylineInstance|null>(null), line=useRef<GooglePolylineInstance|null>(null), mapsRef=useRef<GoogleMapsApi|null>(null), init=useRef(false), anim=useRef<number|null>(null), prev=useRef<LatLng|null>(null);
  const [error,setError]=useState(''),[ready,setReady]=useState(false);
  const latest=points.at(-1); const heading=useMemo(()=>resolveCourierHeading(points),[points]); const dir=useMemo(()=>getCourierDirectionIndex(heading),[heading]); const dirName=getCourierSpriteFrame(dir).name;
  const center=useRef(latest?ll(latest):destination?ll(destination):DEFAULT_CENTER);
  const remaining=useMemo(()=>latest&&!isTerminal?remainingRoute(routePath,latest):[],[latest,isTerminal,routePath]);
  useEffect(()=>{let active=true;loadGoogleMaps().then(m=>{if(!active||!ref.current||map.current)return;mapsRef.current=m;map.current=new m.Map(ref.current,{center:center.current,zoom:15,disableDefaultUI:false,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,zoomControl:true,rotateControl:true,scaleControl:true,clickableIcons:true,gestureHandling:'greedy',colorScheme:'LIGHT',backgroundColor:'#eef2f3'});outline.current=new m.Polyline({map:map.current,path:[],geodesic:true,strokeColor:'#fff',strokeOpacity:.96,strokeWeight:11,zIndex:2});line.current=new m.Polyline({map:map.current,path:[],geodesic:true,strokeColor:'#e96725',strokeOpacity:.98,strokeWeight:6,zIndex:3});setReady(true);setError('');}).catch(e=>active&&setError(e instanceof Error?e.message:'Não foi possível carregar o mapa.'));return()=>{active=false;if(anim.current)cancelAnimationFrame(anim.current);};},[]);
  useEffect(()=>{const m=mapsRef.current,mp=map.current;if(!ready||!m||!mp||!latest)return;const target=ll(latest),icon=courierIcon(m,dir);if(!bike.current){bike.current=new m.Marker({map:mp,position:target,title:courierName,optimized:false,zIndex:8,icon});prev.current=target;}else{bike.current.setIcon(icon);const start=prev.current||target,t0=performance.now();if(anim.current)cancelAnimationFrame(anim.current);const step=(now:number)=>{const p=Math.min(1,(now-t0)/900),e=1-Math.pow(1-p,3),pos={lat:start.lat+(target.lat-start.lat)*e,lng:start.lng+(target.lng-start.lng)*e};bike.current?.setPosition(pos);if(p<1)anim.current=requestAnimationFrame(step);else prev.current=target;};anim.current=requestAnimationFrame(step);}const b=mp.getBounds?.();if(init.current&&b&&!b.contains(target))mp.panTo(target);},[latest,ready,dir,courierName]);
  useEffect(()=>{const m=mapsRef.current,mp=map.current;if(!ready||!m||!mp)return;if(destination){const p=ll(destination);if(!dest.current)dest.current=new m.Marker({map:mp,position:p,title:destination.label||'Endereço de entrega',zIndex:9,icon:{url:destinationSvg(),scaledSize:new m.Size(54,64),anchor:new m.Point(27,61)}});else dest.current.setPosition(p);}const path=remaining.map(ll);outline.current?.setPath(path);line.current?.setPath(path);if(!init.current&&latest){const b=new m.LatLngBounds();b.extend(ll(latest));if(destination)b.extend(ll(destination));remaining.forEach(p=>b.extend(ll(p)));mp.fitBounds(b,{top:90,right:52,bottom:72,left:52});init.current=true;}},[destination,latest,ready,remaining]);
  const recenter=()=>{const m=mapsRef.current,mp=map.current;if(!m||!mp||!latest)return;const b=new m.LatLngBounds();b.extend(ll(latest));if(destination)b.extend(ll(destination));remaining.forEach(p=>b.extend(ll(p)));mp.fitBounds(b,{top:90,right:52,bottom:72,left:52});};
  const distance=Number.isFinite(distanceMeters)?`${(Number(distanceMeters)/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})} km restantes`:'Rota em acompanhamento';
  return <S.Shell data-testid="customer-google-delivery-map" data-map-provider="google-maps" data-courier-direction={dirName} className="customer-google-delivery-map delivery-map-shell" data-tracking-terminal={isTerminal?'true':'false'}>
    <S.Canvas ref={ref} aria-label="Mapa Google com a rota da entrega"/>
    {error?<S.ErrorState role="alert"><MapPinOff/><strong>Mapa indisponível</strong><p>{error} O rastreamento continua funcionando.</p></S.ErrorState>:null}
    {!error?<><S.EtaCard aria-live="polite"><small>{isTerminal?'Última rota':'Chegada estimada'}</small><strong>{etaMinutes?`${etaMinutes} min`:isTerminal?'Concluída':'Calculando'}</strong><span>{distance}</span></S.EtaCard><S.RecenterButton type="button" onClick={recenter} aria-label="Centralizar rota"><LocateFixed/></S.RecenterButton><S.LiveBadge><i/>{isTerminal?'Rastreamento encerrado':`${courierName} em tempo real`}</S.LiveBadge></>:null}
  </S.Shell>;
}
