import { useState, useMemo, useCallback, useEffect, useRef, useId } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, signInWithGoogle, signOutUser, getRedirectResult } from "./firebase";
import html2canvas from "html2canvas";

// ─── TEMA POR FAMÍLIA ─────────────────────────────────────────────────────────
const TYPE_THEME = {
  "Sour":           { bg:"#1C1400", border:"#C8860A", accent:"#F4A623", label:"#FFD580" },
  "Highball":       { bg:"#00141E", border:"#0A7EA4", accent:"#38BDF8", label:"#7DD3FC" },
  "Collins":        { bg:"#00140A", border:"#16803C", accent:"#4ADE80", label:"#86EFAC" },
  "Spritz":         { bg:"#1E0800", border:"#C2410C", accent:"#FB923C", label:"#FDBA74" },
  "Fizz":           { bg:"#00131A", border:"#0E7490", accent:"#22D3EE", label:"#A5F3FC" },
  "Não alcóolicos": { bg:"#081400", border:"#4D7C0F", accent:"#84CC16", label:"#D9F99D" },
  "Stirred":        { bg:"#12100A", border:"#8B6914", accent:"#D4A843", label:"#F0CC7A" },
  "Shaken":         { bg:"#0A0018", border:"#6D28D9", accent:"#8B5CF6", label:"#C4B5FD" },
  "Built":          { bg:"#0A0F18", border:"#1D4ED8", accent:"#3B82F6", label:"#93C5FD" },
  "Buck":           { bg:"#180A00", border:"#B45309", accent:"#F59E0B", label:"#FCD34D" },
  "Smash":          { bg:"#001A0A", border:"#065F46", accent:"#10B981", label:"#6EE7B7" },
  "Sling":          { bg:"#1A0010", border:"#9D174D", accent:"#EC4899", label:"#F9A8D4" },
  "Hot":            { bg:"#1A0A00", border:"#DC2626", accent:"#F87171", label:"#FCA5A5" },
  "Beer Highballs":    { bg:"#0F0800", border:"#A16207", accent:"#CA8A04", label:"#FEF08A" },
  "Preparos Caseiros": { bg:"#080E02", border:"#3D6B10", accent:"#74A828", label:"#AEDD72" },
  "_default":       { bg:"#151008", border:"#78614A", accent:"#C8A96E", label:"#E5C99E" },
};

const STYLE_PRIORITY = ["Não alcóolicos","Sour","Highball","Collins","Spritz","Fizz","Buck","Beer Highballs","Smash","Sling","Hot","Stirred","Shaken","Built","Preparos Caseiros"];
const STYLE_CATS = new Set(STYLE_PRIORITY);
const SPIRIT_CATS = new Set(["Gim","Rum","Rum Envelhecido","Vodka","Whisky","Tequila","Mezcal","Pisco","Conhaque","Campari","Aperol","Cynar","Absinto","Amaretto","St‑Germain","Licor","Licor Beirão","Luxardo Maraschino","Triple Sec","Espumante","Vermute Branco","Vermute Tinto","Vermute seco","Ginger Beer","Cachaça","Fernet-Branca","Licor Strega","Jerez","Porto Tinto","Porto Branco","Lillet","Vinho"]);
const ALL_SPIRIT_OPTIONS = [...SPIRIT_CATS].sort();
const FAMILY_GROUPS = [
  { label:"Família", items:["Sour","Highball","Collins","Spritz","Fizz","Sling","Buck","Beer Highballs","Smash","Hot","Não alcóolicos"] },
  { label:"Preparos", items:["Preparos Caseiros"] },
];
const TECHNIQUES = ["Stirred","Shaken","Built"];

const FAMILY_DESC = {
  "Sour":           "Equilíbrio clássico entre destilado, cítrico e adoçante. O frescor do limão encontra a doçura do xarope, criando drinks vibrantes e bem estruturados. Podem levar clara de ovo, que traz textura aveludada. É a base de famílias como Collins e Fizz — a principal diferença está no uso de gás e na textura final.",
  "Highball":       "Simplicidade que nunca sai de moda. Um destilado combinado com um mixer gelado — água tônica, refrigerante ou soda — servido num copo alto com bastante gelo. Direto e refrescante, com foco no equilíbrio e na diluição ao longo do tempo.",
  "Collins":        "Um Sour alongado com soda, servido num copo alto. Leve, cítrico e efervescente, perfeito para quem busca frescor com um pouco mais de volume.",
  "Spritz":         "Drinks com vinho espumante ou prosecco como base, completados com um licor amargo ou aperitivo e uma splash de soda. Cor vibrante, amargor elegante e muitas bolhas. Uma alternativa sofisticada aos Highballs para quem prefere algo mais aromático e menos alcoólico.",
  "Fizz":           "Compartilha o DNA do Sour e do Collins — destilado, cítrico e adoçante — mas é batido no shaker antes de receber a soda, criando uma textura mais leve, aerada e espumosa. Um clássico das tardes quentes.",
  "Sling":          "Destilado, adoçante, cítrico e água — uma das estruturas mais antigas da coquetelaria. Mais simples que um Sour e menos efervescente que um Collins, o Sling carrega uma elegância histórica que deu origem a muitos clássicos modernos.",
  "Buck":           "Espirituoso, suco de limão e ginger beer ou ginger ale. A picância do gengibre faz todo o trabalho aqui — diferente do Highball, que usa mixers neutros, o Buck tem personalidade própria e inconfundível. O Moscow Mule é o exemplo mais famoso da família.",
  "Beer Highballs": "Cerveja como mixer principal — combinada com destilados ou licores para drinks longos, refrescantes e com caráter.",
  "Smash":          "Ervas frescas e frutas amassadas diretamente no copo ou shaker, misturadas com destilado e gelo quebrado. Mais rústico e aromático que um Sour, mais cheio de frescor que um Built. O processo de macerar os ingredientes é o que define o caráter do drink.",
  "Hot":            "Para os dias frios ou momentos de aconchego. Drinks servidos quentes — com chá, café, leite ou água quente — que aquecem por dentro e encantam pelos aromas. Enquanto Shaken e Stirred trabalham o frio e a diluição, os Hot drinks jogam com o calor para liberar camadas de sabor.",
  "Não alcóolicos": "Todo o sabor, zero álcool. Drinks elaborados com xaropes artesanais, sucos, ervas e água tônica — tão complexos e bem construídos quanto qualquer Sour, Spritz ou Collins da carta. A técnica é a mesma; o que muda é a base.",
  "Stirred":        "Mexidos delicadamente com gelo até atingir a temperatura e diluição ideais. Sem shaker, sem barulho — só textura sedosa e sabor concentrado. O oposto do Shaken: aqui a aeração não é bem-vinda, e os destilados falam por si mesmos.",
  "Shaken":         "Agitados vigorosamente no shaker para misturar, resfriar e aerar de uma vez. O oposto do Stirred: resultam em drinks mais frios, levemente diluídos e com textura viva. É a técnica certa para receitas com cítrico, clara de ovo ou sucos — como a maioria dos Sours e Fizzes.",
  "Built":          "Construídos diretamente no copo, ingrediente por ingrediente, sem transferências. Sem shaker, sem coador — ao contrário dos Stirred, nem ao menos saem do copo em que serão bebidos. Diretos e honestos, como um bom Negroni ou um Old Fashioned.",
  "Preparos Caseiros": "Os bastidores do bar: xaropes, tinturas, cordiais e infusões feitos em casa. Não são drinks prontos, mas são o que elevam uma receita comum e dão identidade a diversas famílias.",
};

const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();

// ─── SISTEMA DE COPOS ─────────────────────────────────────────────────────────
const FAMILY_GLASS = {
  "Sour":"coupe","Shaken":"coupe",
  "Highball":"highball","Buck":"highball","Beer Highballs":"highball","Não alcóolicos":"highball",
  "Collins":"collins","Fizz":"collins","Sling":"collins",
  "Stirred":"rocks","Built":"rocks","Smash":"rocks",
  "Spritz":"wine","Hot":"irish","_default":"rocks",
};

function GlassIcon({ categories=[], color="#C8A96E", size=40, opacity=1 }) {
  const fam = STYLE_PRIORITY.find(s => categories.includes(s)) || "_default";
  const shape = FAMILY_GLASS[fam] || "rocks";
  const f = color;
  const sq = { width:size, height:size,                      viewBox:"0 0 1190.55 1190.55", style:{opacity,display:"block",flexShrink:0} };
  const tl = { width:size, height:Math.round(size*1.167),    viewBox:"0 0 1190.55 1389.31", style:{opacity,display:"block",flexShrink:0} };

  if (shape === "coupe") return (
    <svg {...sq} fill={f}>
      <path d="M792.69,1157.77c-131.86,21.23-263.05,21.02-393.31.21-25.91-4.14-67.9-13.07-73.75-24.67-3.42-6.78,8.14-29.15,13.59-31.69,55.61-25.89,137.59-34.2,195.63-75.82,16-11.47,22.34-25.38,24.39-44.51,8.57-80.04,9.55-158.98,12.19-239.2,1.08-32.81,2.16-63.6.02-96.25-2.7-41.12-.34-81.44-7.98-122.58-6.06-32.65-74.54-86.43-108.58-109.21l-155.81-104.28c-25.71-17.2-51.06-32.92-72.63-54.28-25.9-25.64-25.24-74.13-14.74-110.85l21.25-74.3c16.22-10.24,32.85-14.52,51.36-17.47,123.45-19.64,314.3-20.74,442.8-15.4,62.73,2.61,122.67,5.41,184.2,16.27,15.28,2.7,35.04,5.19,46.09,16.56,19.61,59.82,50.8,136.65,9.19,183.95-14.02,15.94-31.46,27.11-49.06,38.76l-112.35,74.38c-42.31,28.01-82.81,54.95-121.38,88.13-48.49,41.71-61.21,55.57-61.29,128.05l-.26,220.79,6.05,125.67c1.33,27.66,3.68,70.11,14.92,82.72,36.51,40.95,126.42,60.66,185.89,79.88,15.31,4.95,27.23,10.33,34.05,25.76,1.5,3.41,4.91,6.85,4.22,11.25-2.32,14.73-45.44,23.4-74.69,28.11ZM346.03,1126.39c18.59,7.25,35.49,10.59,54.32,13.73,105.74,17.65,211.18,20.55,317.75,9.58,44.1-4.54,85.94-9.45,127.69-22.77-1.75-9.76-8.57-13.1-15.76-15.35l-99.04-30.97c-43.52-13.61-105.5-39.88-113.13-82.63-3.83-21.47-5.39-41.83-6.94-64.15-8.39-121.44-9.04-241.94-5.26-363.73,1.72-55.61,9.66-77.84,50.33-114.36,43.05-38.66,89.71-70.32,138.02-102.11l58.24-38.31,80.78-54.6c58.2-39.34,34.34-102.22,13.95-165.71-26.87,9.82-52.59,12.59-79.85,15.41-5.04.52-8.44-4.31-8.31-7.85.63-17.08,48.48-8.02,79.25-24.74-57-14.45-111.45-17.47-168.54-20.64-117.39-6.52-233.04-6.39-350.4.22-55.37,3.12-108.46,5.77-164.36,20.82,37.05,14.83,73.11,14.73,109.91,18.55,64.02,6.64,126.6,6.84,191.26,7.93,24.55.41,47.02,1.12,71.57.67l77.86-1.42c5.42-.1,9.07,6.46,8.43,9.69-.92,4.61-4.33,7.79-11.05,7.98-103.78,2.9-205.76,2.02-309.11-4.88-48.58-3.24-103.61-6.86-149.13-21.94-12.65,45.77-36.63,103.16-11.41,139.33,13.57,19.46,32.5,31.78,51.83,44.59l125.88,83.4c49.02,32.48,153.55,102.49,167.11,149.04,8.79,30.16,8.92,61.01,9.92,92.77,3.15,100.25,1,198.85-4.98,298.95-2.07,34.61-2.38,67.39-10.25,101.11-10.08,43.23-89.78,69.7-135.97,84.16l-79.93,25.01c-4.56,1.43-12.3,7.36-10.66,13.23Z"/>
      <path d="M670.98,1129.95c-2.69,13.27-90.89,10.14-130.09,8.13-48.36-2.48-95.38-3.72-143.04-12.89-6.6-1.27-9.7-4.07-9.34-9.69.32-4.85,5.35-8.87,11.84-7.66,82.28,15.35,180.72,13.72,264.62,12.61,3.08.11,6.48,7.13,6,9.5Z"/>
      <path d="M279.65,219.12c28.69,31.3,70.54,41.9,69.08,52.82-2.5,18.68-40.05-6.51-64.08-24.18-22.07-16.23-39.15-38.86-38.65-67.15.33-18.77,8-35.49,13.5-53.06,1.92-6.14,5.44-10.05,11.36-8.76,23.89,5.21-32,55.83,8.79,100.32Z"/>
      <path d="M557.09,428.08c21.91,4.29,45.24-4.04,47.77,8.43.97,4.76-2.77,10.76-9.7,9.83-13.45-1.82-30.76,3.59-43.7-1.87-25.08-10.6-43.07-32.22-65.21-47.25-9.81-6.66-8.34-16.86-5.12-18.39,13.95-6.64,47.39,35.36,75.95,49.26Z"/>
    </svg>
  );

  if (shape === "wine") return (
    <svg {...tl} fill={f}>
      <path d="M815.22,1347.5c-130.66,21.16-260.57,21.24-389.72.83-26.88-4.25-67.13-11.65-76.54-24.73-4.02-5.59,5.33-30.9,19.81-35.4l68.88-21.41c41.45-12.89,125.34-37.65,137.41-70.9,9.6-26.43,8.91-54.34,11.08-82.5,7.29-94.68,7.14-187.66,7.04-282.81-.05-43.13-5.02-97.29-46.92-105.82-85.7-17.43-165.97-42.49-224.68-111.31-42.25-49.53-68.05-111.11-76.6-176.32-13.5-102.96,22.02-219.92,68.4-312.66,12.78-25.54,155.69-35.04,204.98-37.16h200.41c46.65,0,193.27,12.33,206.26,38.55,21.35,43.08,37.76,86.52,50.86,132.88,34.18,121.02,26.64,240.92-49.92,342.89-56.96,75.87-142.73,104.57-232.8,122.6-44.74,8.95-49.68,65.22-49.22,111.79l1.56,159.58c.6,61.56,3.89,121.26,11.62,182.29,1.94,15.31,7.62,27.24,20.29,36.84,23.7,17.97,50.83,29.69,79.77,38.59l105.11,32.32c22.89,7.04,28.8,31.37,26.81,36.11-5.27,12.55-46.5,21.31-73.89,25.75ZM370.5,1315.67c13.33,7.48,29.02,10.18,43.64,12.77,108.4,19.25,217.15,22.36,326.65,11.11,43.27-4.44,83.93-9.49,125.47-22.24,2.35-.72,1.36-8.73-.54-10.23-1.82-1.44-4.55-3.4-8.51-4.61l-99.29-30.33c-39.12-11.95-110.62-41.83-114.87-76.82l-8.6-70.75c-7.52-98.33-7.84-195.08-7.59-293.98.14-55.43,8.03-113.66,65.37-124.39,109.9-20.58,199.55-61.14,250.08-164.34,27.83-56.82,40.06-116.2,34.63-180.03-4.59-53.93-16.34-105.26-36.54-155.16l-22.8-56.33c-30.91,13.03-82.33,25.8-78.09,7.76,2.89-12.27,42.19-8.44,69.29-23.82-35.6-18.42-111.24-25.62-153.12-27.51l-59.49-2.68-143.99-.07-70.76,2.74c-40.12,1.55-118.51,9.69-152.94,27.39,46.31,19.75,147.33,28.57,198.75,28.88l172.5,1.04c7.09.04,14.75-4.51,19.65,4.79,2.26,4.28-1.8,11.89-8.38,11.86l-200.61-.94-77.85-6.89c-35.64-1.96-78.12-7.44-111.99-22.76-54.66,121.04-88.08,251.04-31.91,378.04,48.7,110.1,138.53,156.14,253.92,177.28,58.88,10.79,68.94,67.08,67.87,125.03l-4.62,249.06c-.75,40.36-2.8,79.2-12.04,118.53-8.17,34.79-77.3,62.89-116.61,74.81l-95.34,28.9c-4.74,1.44-16.44,8.04-11.36,13.86Z"/>
      <path d="M370.7,571.4c4.65,5.94,3.03,10.49-1.23,13.93-3.96,3.19-8.64,1.96-13.1-3.74-90.37-115.21-83.84-262.33-18.69-390.5,2.6-5.12,8.1-7.55,12.7-5.08,5.64,3.03,5.8,8.34,2.51,14.66-62.34,119.67-68.22,260.82,17.82,370.73Z"/>
      <path d="M680.68,1325.48c-42.35,6.23-83.08,4.49-124.91,2.51-49.19-2.32-96.92-3.84-145.3-13.02-5.79-1.1-8.32-5.39-8.1-9.1.28-4.73,4.37-8.84,10.4-8.17l94.82,10.55,172.04,2.08c4.94.06,6.3,14.37,1.05,15.14Z"/>
    </svg>
  );

  if (shape === "highball") return (
    <svg {...tl} fill={f}>
      <path d="M841.69,1293.81c-96.2,45.38-268.56,42.84-375.2,23.03-30.3-5.63-57.97-14.75-83.64-29.2-21.97-12.36-29.95-33.02-30.26-57.18l-1.81-139.56-2.68-234.57-5.2-341.24-2.76-288.63c-.23-24.33-6.97-60.69,4.57-69.82,30.92-24.48,144.15-30.47,197.64-33.17,93.77-4.72,227.28-1.43,316.65,18.88,14.66,3.33,26.87,9.1,38.28,20.17l-2.3,208.69-2.51,201.36-3.42,232.94-1.67,148.11-3.81,230.26-2.8,68.87c-.75,18.49-22.49,33.23-39.08,41.05ZM706.27,1308.35c41.88-4.32,81.27-10.09,120.01-26.88,14.16-6.14,37.44-17.24,37.79-34.31l3.08-151.13,5.64-343.25,2.6-234.87,3.39-241.77.74-87c-29.62,9.87-76.8,22.99-76.25,7.59.57-15.69,44.65-9.43,76.15-27.14-19.95-11.47-40.54-13.62-61.63-17.15-53.19-8.9-105.55-12.54-159.12-12.59l-79.96-.07c-53.75-.05-106.19,3.68-159.47,12.51-21.13,3.5-41.86,5.2-61.72,17.71,31.14,13.22,61.02,16.82,92.97,20.5,84.66,9.76,168.65,8.54,254.07,6.4,6.76-.17,10.58,3.85,10.97,7.69.31,2.97-1.48,9.22-6.44,9.48-91.98,4.96-183.14,3.05-274.81-7.72-27-3.17-50.59-7.65-77.96-17.45l2.92,224.65,3.38,247.61,1.93,164.33,3.2,214.26,2.09,170.89c.42,34.73.17,51.67,29.37,65.78,79.96,38.64,216.8,41.22,307.04,31.92Z"/>
      <path d="M392.59,988.38l-1.85-109.08-3.49-253.48-2.94-175.02-1.79-162.51c-.3-27.04-5.9-53.38,5.93-57.98,3.24-1.26,10.86,2.77,10.93,8.47l2.57,214.11,1.92,122.17,3.27,213.61,2.11,196.4c.06,5.38-2.39,8.58-5.78,10.15-2.86,1.33-10.76-.03-10.87-6.84Z"/>
      <path d="M428.55,1200.87c45.83,13.94,91.06,19.39,137.54,21.52,4.39.2,7.57,4.26,8.3,7.04,5.89,22.59-111.99.57-156.32-13.79-11.78-3.82-24.35-10.75-28.73-22.14-4.67-12.12,5.96-21.44,16.97-24.94,67.34-21.44,220.34-25.04,295.53-17.18l81.96,8.57c3.71.39,4.01,9.2,2.28,12.1-1.55,2.61-5.55,4.83-11.03,4.15-108.89-13.56-217.97-14.92-326.67.26-14.73,2.06-27.21,4.53-40.8,12.31,5.26,5.61,11.9,9.35,20.97,12.11Z"/>
      <path d="M824.86,1204.19c-24.74,13.33-82.18,28.37-83.77,13.54-1.87-17.41,34.8-7.17,72.24-28.02,3.66-2.04,5.95-5.69,10.77-4.16,2.53.8,5.84,3.65,6.3,7.13.4,3.1-1.09,9.12-5.53,11.51Z"/>
      <path d="M411.53,1110.4c.04,6.62-6.33,9.72-9.59,9.09-4.58-.89-7.41-4.87-7.5-10.36-.62-35.96-7.78-74.14,9.9-68.54,3,.95,6.79,4.47,6.83,9.86l.37,59.95Z"/>
    </svg>
  );

  if (shape === "collins") return (
    <svg {...tl} fill={f}>
      <path d="M818.9,1293.66c-94.53,45.19-270.08,42.9-375.26,23.25-29.6-5.53-56.86-14.41-81.8-27.96-23.96-13.01-30.85-33.36-33.27-58.66l-18.91-197.73L223.11,174.7c7.04-8.43,16-12.14,26.39-14.39,51.88-11.22,103.86-15.54,156.99-17.25l87.81-2.83h200.22s90.57,2.91,90.57,2.91c53.23,1.72,104.73,5.69,156.9,17.6,8.05,1.84,22.79,6.04,24.47,16.11l-84.39,836-24.6,241.05c-1.85,18.16-23.71,32.68-38.56,39.78ZM505.44,1308.23c86.8,8.81,222.66,6.97,299.62-27.76,15.54-7.01,34.68-17.72,36.5-35.98l50.21-503.75,54.97-543.58-58.32,10.23c-6.23,1.09-10.69.11-13.63-3.88-2.17-2.93-1.54-12.15,2.62-12.79,21.53-3.29,42.42-4.4,62.68-11.55-40.67-12.08-79.07-14.46-118.84-16.28l-64.47-2.96-103.77-3.17h-117.17s-100.98,3.09-100.98,3.09l-67.22,3.06c-39.7,5-78.1,3.9-119.21,16.98,63.8,14.11,127.16,16.34,192.72,19.42,97.62,4.59,193.39,2.25,291.37,1.46,8.3-.07,12.4,2.1,11.67,10-.46,4.99-4.82,7.09-11.41,7.23l-60.75,1.25-157.76-.16c-89.53-3.34-180.14-2.99-271.3-22.26l56.38,555.76,49.95,496.6c3.59,35.73,110.84,54.45,156.13,59.05Z"/>
      <path d="M372.11,1001.98c.9,9.07-1.94,11.91-5,13.61-2.92,1.63-11.32-.7-11.92-6.81l-75.53-760.61c-.71-7.1.51-11.62,6.51-12.99,7.38-1.67,10.18,3.15,11.02,11.6l74.93,755.19Z"/>
      <path d="M419.98,1204.95c41.24,11.4,83.03,15.08,125.4,17.99,5.96.41,6.41,7.52,4.83,10.14-2.19,3.61-6.34,6.58-12.24,6.4-47.13-1.39-129.25-11.88-163.86-34.17-7-4.51-10.38-13.21-8.61-21.07,6.2-27.41,111.17-31.31,154.76-34.37,53.65-3.77,105.17-3.77,158.72,1.5l76.52,7.53c6.16.61,9.2,5.31,8.34,10.82-.65,4.16-4.83,7.19-11.28,6.42-108.13-12.99-216.46-15.24-324.46.03-16.67,2.36-31.44,4.4-44.98,14.08,12.72,8.64,24.25,11.22,36.86,14.7Z"/>
      <path d="M724.57,1224.71c-5.43.55-7-6.87-6.41-9.79,2.68-13.28,36.28-5.8,70.39-24.4,3.86-2.11,6.75-5.53,10.57-5.29,4.35.28,7.45,3.34,7.75,7.27,1.42,18.61-51.33,29.05-82.31,32.21Z"/>
      <path d="M381.89,1129.52c.43,5.61-6.23,7.88-8.98,7.83-3.83-.07-7.6-3.03-8.02-8.17l-4.59-56.73c-.41-5.12,3.79-10.25,7.37-10.57,6.53-.58,9.33,3.71,9.85,10.48l4.37,57.16Z"/>
    </svg>
  );

  if (shape === "irish") return (
    <svg {...tl} fill={f}>
      <path d="M731.39,1241.23h-319.31c-7.53,0-13.78-4.92-15.55-12.24s1.55-14.55,8.25-17.99l67.18-34.44c20.56-10.54,36.11-28.52,43.64-50.12-25.16-7.76-43.14-31.37-43.14-58.41,0-28.83,20.6-53.69,48.14-59.71v-51.8l47.16,9.09,55.1-9.09v51.85c27.73,6.07,47.8,30.5,47.8,59.66,0,26.87-17.85,50.45-42.84,58.32,7.52,21.64,23.09,39.66,43.68,50.21l67.18,34.44c6.7,3.44,10.02,10.67,8.25,17.99s-8.02,12.24-15.55,12.24h.01ZM415.93,1224.31h311.61l-63.75-32.69c-27.52-14.11-47.5-39.44-54.82-69.49l-2.2-9.04,9.21-1.34c21.53-3.13,37.78-21.93,37.78-43.72,0-22.99-17.24-41.91-40.11-44l-7.69-.7v-49.89h-68.42v49.91l-7.75.66c-22.65,1.93-40.4,21.26-40.4,44.02s16.36,40.74,38.05,43.76l9.28,1.29-2.22,9.1c-7.33,30.03-27.31,55.34-54.81,69.44l-63.75,32.69h-.01Z"/>
      <path d="M609.55,1129.15h-75.97c-33.7,0-61.12-27.42-61.12-61.12s27.42-61.12,61.12-61.12h75.97c33.7,0,61.12,27.42,61.12,61.12s-27.42,61.12-61.12,61.12h0ZM533.58,1023.84c-24.37,0-44.19,19.82-44.19,44.19s19.83,44.19,44.19,44.19h75.97c24.37,0,44.19-19.82,44.19-44.19s-19.83-44.19-44.19-44.19h-75.97Z"/>
      <path d="M572.3,976.07h-1.13c-71.27,0-122.05-26.85-159.78-84.51-8.52-13.02-19.51-33.92-23.49-59.59-2.4-15.48-.55-47.63,1.41-81.66,1.42-24.68,2.89-50.2,2.65-68.83-.44-34.1-7.54-85.2-10.48-105.03-.68-4.59,2.46-8.87,7.04-9.6h0c4.65-.74,9.01,2.45,9.71,7.1,3.01,20.17,10.2,71.73,10.65,107.3.25,19.22-1.24,45.04-2.68,70.01-1.82,31.65-3.71,64.39-1.58,78.09,3.52,22.68,13.33,41.29,20.93,52.91,34.79,53.15,79.7,76.85,145.62,76.85h1.13c65.92,0,110.83-23.7,145.62-76.85,7.61-11.62,17.41-30.23,20.93-52.91,2.13-13.71.24-46.44-1.58-78.1-1.44-24.97-2.93-50.78-2.68-70,.57-44.12,11.49-112.85,11.95-115.75l11.05-62.5c13.45-64.61,26.66-115.67,28.58-123.03-1.01-2.97-16.87-34.85-210.48-34.85s-210.27,25.38-212.59,28.96l18.35,90.26c.93,4.58-2.03,9.05-6.6,9.98h0c-4.58.93-9.04-2.03-9.97-6.6l-18.62-91.57h0c-.39-1.91-.79-6.99,3.81-12.9,17.84-22.93,95.86-35.05,225.64-35.05s202.94,13.5,222.58,39.05c4.82,6.27,5.48,12.46,4.5,16.16-.14.52-14.22,53.97-28.56,122.8l-10.98,62.11c-.09.56-11.17,70.29-11.72,113.16-.24,18.62,1.23,44.14,2.65,68.81,1.96,34.04,3.81,66.19,1.41,81.67-3.98,25.67-14.97,46.57-23.49,59.59-37.74,57.65-88.51,84.51-159.78,84.51h-.01ZM786.42,379.09v.03-.03Z"/>
      <path d="M570.06,417.92c-19.91-.41-193.78-4.98-221.95-37.94l12.87-11c17.52,20.5,137.65,30.52,209.26,32.02,37.12,0,192.54-6.94,219.36-26.58l10,13.65c-37.08,27.15-227.65,29.84-229.54,29.84h0Z"/>
      <path d="M443.56,777.29h0c-4.6-.19-8.17-4.06-8.01-8.67,1.54-43.49,1.14-86.71-1.21-128.71-.26-4.64,3.26-8.63,7.9-8.92h0c4.7-.29,8.73,3.31,8.96,8.02,1.91,40.73,1.34,106.62,1.06,130.04-.06,4.71-3.99,8.44-8.7,8.25Z"/>
      <path d="M433.54,547.31h0c4.77-.79,9.26,2.5,9.93,7.29,1.09,7.85,2.72,20.82,4.35,38.31.44,4.74-3.05,8.94-7.79,9.34h0c-4.62.4-8.72-2.95-9.24-7.55-1.18-10.28-3.19-27.72-4.36-37.93-.52-4.55,2.61-8.7,7.13-9.46Z"/>
      <path d="M799.64,900.12c-.74,0-1.48,0-2.22-.02-39.66-.86-55.63-14.79-65.17-23.1-.88-.77-1.71-1.49-2.5-2.15l10.83-13.01c.89.74,1.82,1.55,2.79,2.4,8.81,7.69,20.88,18.21,54.41,18.94,55.59,1.25,140.95-49.36,148.21-161.71,7.92-122.5-62.89-190.68-102.55-199.96-43.31-10.12-76.16,1.91-76.48,2.03l-6.01-15.82c1.52-.58,37.75-14.05,86.35-2.69,53.54,12.52,123.5,95.08,115.59,217.53-7.88,121.93-101.2,177.56-163.25,177.56h0Z"/>
      <path d="M802.37,836.36c-21.38,0-36.95-11.15-45.61-19.5-5.23-5.05-10.95-10.79-14.92-14.99l12.29-11.63c3.81,4.02,9.32,9.56,14.37,14.44,11.18,10.78,29.98,21.19,56.15,9.63,27.79-12.28,64.54-65.68,58.31-130.13-6.23-64.4-37.71-106.57-78.24-104.92-28.78,1.17-42.6,14.63-47.2,20.36l-13.19-10.6c6.05-7.53,23.99-25.21,59.71-26.66,50.08-2.04,88.62,46.26,95.77,120.19,6.5,67.16-30.08,130.35-68.32,147.24-10.63,4.7-20.37,6.57-29.12,6.57h0Z"/>
    </svg>
  );

  // rocks / old fashioned — copo 5
  return (
    <svg {...tl} fill={f}>
      <path d="M766.11,1026.22c-104.29,30.62-351.36,33.88-430.08-30.95-14.57-12-17.43-27.56-18-45.35l-5.03-157.48-3.21-132.69-5.79-205.81c-1.17-41.66,221.61-45.71,280.66-45.66,71.59.06,140.49,2.41,210.65,14.11,34.64,5.78,75.23,14.53,66.65,43.05l-7.99,287.26-3.08,129.93-1.89,64.51c-.69,23.56-8.56,44.41-29.64,56.55-16.67,9.6-34.29,16.97-53.24,22.54ZM802.81,993.23c19.82-9.38,28.11-25.21,28.66-46.15l2.94-111.81,3.37-129.19,5.05-161.1,1.31-69.95c-29.43,9.89-75.29,22.91-75.71,7.61-.44-15.93,42.86-9.33,75.42-26.79-46.17-23.13-160.74-30.04-215-30.01l-94.03.05c-54.9,2.85-108.51,4.21-162.79,14.33-17.22,3.21-33.25,5.75-47.74,14.13,7.76,7.16,16.22,9.12,25.19,11.12,46.6,10.37,92.54,16.6,140.58,17.01l184.66,1.58c6.28.05,7.25,7.62,4.96,11.32-2.22,3.6-4.57,5.12-10.31,5.26l-55.3,1.38c-21.55.54-42.96,2.59-64.67-.39-74.2-2.54-155.3-2.95-227.39-26.31l4.17,142.85,3.41,129.07,3.17,109.6c1.03,35.74-.1,70.43,4.45,106.08,8.92,69.93,333.05,93.07,465.61,30.32Z"/>
      <path d="M413.64,923.35c38.57,9.48,77.21,14.55,116.9,14.94,5.48.05,8.64,6.03,8.48,9.42-.25,5.15-4.23,9.76-11.05,9.37-48.51-2.81-174.55-15.5-174.8-51.71-.16-23.05,53.71-29.67,87.18-33.22,102.16-10.85,203.04-9.17,304.67,3.79,4.74.6,7.01,4.95,7.77,7.41.88,2.88-3.18,10.64-7.91,10.03-40.91-5.23-80.99-7.53-122.33-10.34-28.36-1.93-55.87-1.94-84.29-.04-39.64,2.66-78.52,2.74-117.82,9.35-17.22,2.9-33.99,3.93-49.66,14.01,14.03,9.83,27.99,13.32,42.87,16.98Z"/>
      <path d="M370.39,781.37c.14,5.93-4.96,7.08-7.24,7.51-2.26.43-8.81-.33-8.93-4.17l-5.15-155.7-2.42-102.89c-.13-5.44,4.38-8.68,8.09-9.04,5.13-.5,9.24,2.89,9.38,9.55l1.48,69.03,3.43,126.11,1.38,59.59Z"/>
      <path d="M717.3,941.61c-6.51.95-11.2-3-11.69-7.8-1.7-16.4,30.04-5.33,71.5-26.66,3.78-1.94,6.47-7.57,11.61-5.45,3.68,1.51,7.34,5.01,7.25,9.51-.31,15.91-49.81,26.21-78.67,30.4Z"/>
    </svg>
  );
}

// ─── RECEITAS ─────────────────────────────────────────────────────────────────
const BASE_RECIPES = [
  {name:"Aperol Spritz",categories:["Espumante","Highball","Built"],ingredients:["150 ml prosecco","100 ml Aperol","50 ml água com gás","5 cubos gelo","1 rodela laranja"],steps:["Coloque os ingredientes em um copo largo","Obedeça à proporção 3:2:1 — prosecco, Aperol e água com gás"],notes:"",rating:0,servings:"",custom:false},
  {name:"Aviation",categories:["Gim","Luxardo Maraschino","Licor","Sour","Shaken"],ingredients:["45 ml gim","15 ml Luxardo Maraschino","15 ml suco de limão","(opcional) 5 ml creme de violeta"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe duplo em coupe gelada.","Decore com cereja marrasquino."],notes:"Floral e levemente ácido. O creme de violeta é opcional mas dá a cor roxa característica.",rating:0,servings:"",custom:false},
  {name:"Beirão & Maracujá",categories:["Collins","Licor Beirão","Built"],ingredients:["40 ml Licor Beirão","30 ml suco de maracujá","10 ml limão","soda"],steps:["Combine Beirão, maracujá e limão com gelo num copo alto.","Complete com soda gelada.","Mexa suavemente e decore."],notes:"Tropical e refrescante. O maracujá equilibra o amargor do Beirão.",rating:0,servings:"",custom:false},
  {name:"Beirão + Campari",categories:["Campari","Licor Beirão","Stirred"],ingredients:["30 ml Beirão","30 ml Campari","gelo","casca de laranja"],steps:["Adicione Beirão e Campari num copo com gelo.","Mexa suavemente.","Expresse a casca de laranja sobre o drink e decore."],notes:"Dois amargos que se completam. Intenso e sem açúcar.",rating:0,servings:"",custom:false},
  {name:"Beirão Lemon",categories:["Collins","Licor Beirão","Built"],ingredients:["50 ml Licor Beirão","20 ml limão","soda ou água com gás","gelo"],steps:["Combine Beirão e limão num copo com gelo.","Complete com soda gelada.","Mexa uma vez e sirva."],notes:"Simples e refrescante. A versão mais acessível do Beirão.",rating:0,servings:"",custom:false},
  {name:"Beirão Spritz",categories:["Espumante","Highball","Licor Beirão","Built"],ingredients:["40 ml Licor Beirão","80 ml espumante","40 ml água com gás","casca de laranja"],steps:["Adicione gelo e Beirão numa taça de vinho.","Complete com espumante e água com gás.","Expresse a casca de laranja e decore."],notes:"O Aperol Spritz com personalidade portuguesa.",rating:0,servings:"",custom:false},
  {name:"Beirão, Mel & Alecrim",categories:["Licor Beirão","Stirred"],ingredients:["50 ml Licor Beirão","15 ml mel","15 ml suco de limão","1 ramo de alecrim","gelo"],steps:["Misture mel e limão primeiro.","Adicione o Beirão e gelo.","Mexa e finalize com alecrim."],notes:"",rating:0,servings:"",custom:false},
  {name:"Belle Époque (Casa do Porco)",categories:["Gim","Shaken"],ingredients:["Gim com infusão de flor de hibisco","Calda de gengibre","Limão Siciliano","Cidre Charlotte Corday"],steps:["Infuse o gim com flor de hibisco por 2h.","Combine gim, calda de gengibre e limão na coqueteleira com gelo.","Agite e coe em coupe. Complete com cidre."],notes:"Receita assinatura do Casa do Porco, SP. Floral, ácido e elegante.",rating:0,servings:"",custom:false},
  {name:"Bourbon, laranja e gengibre",categories:["Whisky","Built"],ingredients:["60 ml bourbon","30 ml Triple Sec","3 col. sopa xarope de gengibre","90 ml suco de laranja","gelo esmagado"],steps:["Prepare o xarope de gengibre: ferva gengibre, açúcar e água por 15 min.","Combine o bourbon, triple sec, xarope e suco de laranja.","Encha com gelo esmagado."],notes:"",rating:0,servings:"",custom:false},
  {name:"Bramble",categories:["Gim","Sour","Shaken"],ingredients:["1½ dose gim","1 dose suco de limão siciliano","1 col. chá açúcar","1 dose rasa licor de amora"],steps:["Bata o gim, limão e açúcar com gelo e coe num copo cheio de gelo.","Despeje o licor de amora por cima.","Decore com amora, limão e hortelã."],notes:"Servir em Double old-fashioned",rating:0,servings:"1",custom:false},
  {name:"Cantaloupe Martini sem álcool",categories:["Não alcóolicos","Shaken"],ingredients:["15 ml xarope de manjericão","240 ml suco de melão cantaloupe","10 ml suco de limão","Sal marinho","Gelo"],steps:["Bata tudo e sirva"],notes:"",rating:0,servings:"",custom:false},
  {name:"Citrus Martini",categories:["Aperol","Vodka","Sour","Shaken"],ingredients:["30 ml aperol","50 ml vodka","10 ml suco de limão","1 col. sopa açúcar"],steps:["Gele a taça. Combine tudo na coqueteleira com gelo. Bata bem e faça dupla coagem."],notes:"",rating:0,servings:"",custom:false},
  {name:"Coco e tônica",categories:["Não alcóolicos","Built"],ingredients:["100 ml água de coco","70 ml água tônica","2 col. sopa açúcar","1 lima da pérsia"],steps:["Macere a lima com açúcar. Adicione gelo, água de coco e complete com tônica."],notes:"",rating:0,servings:"",custom:false},
  {name:"Cynar Ginger Spritz",categories:["Cynar","Spritz","Built"],ingredients:["40 ml Cynar","60 ml espumante brut","40 ml tônica de gengibre","Gelo","Casca de laranja"],steps:["Adicione gelo e Cynar numa taça.","Complete com tônica de gengibre e espumante.","Expresse a casca de laranja e decore."],notes:"Amargo, efervescente e refrescante. O gengibre potencializa o Cynar.",rating:0,servings:"",custom:false},
  {name:"Daiquiri Parisiense",categories:["Rum","St‑Germain","Sour","Shaken"],ingredients:["40 ml rum branco","20 ml St-Germain","20 ml suco de limão","1 col. chá açúcar"],steps:["Dissolva o açúcar no limão.","Adicione rum e St-Germain com gelo.","Bata e coe em coupe gelada."],notes:"O St-Germain florifica o Daiquiri clássico. Mais elegante e menos direto.",rating:0,servings:"",custom:false},
  {name:"Dark 'n' Stormy",categories:["Rum Envelhecido","Highball","Buck","Built"],ingredients:["60 ml rum escuro","120 ml cerveja de gengibre","15 ml suco de limão"],steps:["Encha o copo com gelo.","Adicione o limão e a ginger beer.","Despeje o rum por cima — ele flutua criando a cor escura."],notes:"Marca registrada da Gosling's. O rum por cima é parte da apresentação.",rating:0,servings:"",custom:false},
  {name:"drink de xarope de manjericão com gim",categories:["Gim","Smash","Shaken"],ingredients:["60 ml gim","50 ml xarope de manjericão","suco de 1 limão","suco de 2 pepinos japoneses","Manjericão para decorar"],steps:["Prepare o xarope: água + açúcar (1:1), fervente, desligue e infuse manjericão.","Bata o pepino, coe e reserve.","Combine tudo com gelo e sirva."],notes:"",rating:0,servings:"",custom:false},
  {name:"Dry Martini",categories:["Gim","Vermute seco","Stirred"],ingredients:["2½ partes Gim","½ parte Vermute seco","1 dash licor amargo de laranja","casca de limão"],steps:["Encher copo misturador com gelo.","Adicionar ingredientes e mexer.","Coar em taça gelada. Decorar com limão."],notes:"",rating:0,servings:"",custom:false},
  {name:"Elderflower Aviation",categories:["Gim","Luxardo Maraschino","St‑Germain","Sour","Shaken"],ingredients:["45 ml gim","10 ml St-Germain","10 ml Luxardo Maraschino","20 ml suco de limão"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente e coe duplo em coupe."],notes:"O St-Germain substitui parte do Maraschino — fica mais floral e menos doce que o Aviation clássico.",rating:0,servings:"",custom:false},
  {name:"Elderflower Daiquiri",categories:["Luxardo Maraschino","Rum","St‑Germain","Sour","Shaken"],ingredients:["60 ml rum branco","15 ml St-Germain","5 ml Maraschino","20 ml suco de limão"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em coupe gelada."],notes:"Fresco, floral e com fundo elegante de amêndoa. Mais complexo que o Daiquiri clássico.",rating:0,servings:"",custom:false},
  {name:"Fermentação selvagem (Ginger Bug)",categories:["Ginger Bug","Preparos Caseiros"],ingredients:["8 cm gengibre fresco","2 xícaras açúcar branco","2 limões","Água sem cloro"],steps:["Adicione gengibre ralado e açúcar em 250 ml água.","Cubra e guarde em local escuro.","Alimente diariamente até borbulhar (2–7 dias)."],notes:"Fermentação selvagem",rating:0,servings:"4L",custom:false},
  {name:"Flor de Cerejeira Fizz",categories:["Espumante","Fizz","Luxardo Maraschino","Spritz","St‑Germain","Built"],ingredients:["20 ml Luxardo","20 ml St-Germain","10 ml limão","completar com água com gás ou espumante"],steps:["Combine Luxardo, St-Germain e limão com gelo.","Complete com água com gás ou espumante gelado.","Decore com casca de limão ou flor comestível."],notes:"Floral, leve e muito perfumado. Baixo teor alcoólico.",rating:0,servings:"",custom:false},
  {name:"French 75",categories:["Espumante","Fizz","Gim","Shaken"],ingredients:["30 ml gim","15 ml suco de limão","15 ml xarope simples","prosecco para completar"],steps:["Combine gim, limão e xarope na coqueteleira com gelo.","Agite e coe em taça flute.","Complete com prosecco."],notes:"Cítrico, seco e sofisticado.",rating:0,servings:"",custom:false},
  {name:"Garden Spritz",categories:["Espumante","Luxardo Maraschino","Spritz","St‑Germain","Built"],ingredients:["25 ml St-Germain","10 ml Maraschino","80 ml prosecco","splash de soda"],steps:["Adicione gelo numa taça de vinho.","Coloque St-Germain e Maraschino.","Complete com prosecco e um splash de soda."],notes:"Leve, perfumado e delicado. Perfeito para aperitivo.",rating:0,servings:"",custom:false},
  {name:"Gim Fizz",categories:["Gim","Fizz","Shaken"],ingredients:["60 ml Gim","30 ml suco de lima","22 ml xarope simples","Água com gás","1 fatia limão"],steps:["Agite gim, limão e xarope com gelo.","Coe em copo alto.","Complete com água com gás."],notes:"",rating:0,servings:"",custom:false},
  {name:"Gim Tônica",categories:["Gim","Highball","Built"],ingredients:["50 ml Gim","150 ml Tônica","fatia de limão"],steps:["Encha taça balão com gelo.","Adicione o gim.","Complete com tônica pela lateral. Mexa uma vez."],notes:"",rating:0,servings:"",custom:false},
  {name:"Gim Tônica de Bergamota",categories:["Gim","Highball","Built"],ingredients:["50 ml Gim","150 ml Tônica","4 gomos de bergamota","2 gotas Angostura"],steps:["Esprema os gomos de bergamota no fundo da taça balão.","Encha com gelo. Adicione o gim.","Complete com tônica pela lateral. Pingue o Angostura."],notes:"Cítrico, levemente floral e com fundo amargo. Variação elegante do G&T clássico.",rating:0,servings:"",custom:false},
  {name:"Ginger beer (caseira)",categories:["Ginger Beer","Preparos Caseiros"],ingredients:["100g gengibre","200g açúcar","1 limão","1,5L água","6g fermento"],steps:["Ferva a água com gengibre e limão fatiados. Adicione açúcar e cozinhe 15 min.","Coe e transfira para balde fermentador com o fermento dissolvido.","Após 4 dias, transfira com 8g açúcar/litro. Aguarde 2 semanas."],notes:"",rating:0,servings:"",custom:false},
  {name:"Grenadine Ginger Margarita",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["60 ml tequila","30 ml suco de limão","15 ml Cointreau","15 ml grenadine","60 ml ginger beer"],steps:["Combine tequila, limão, Cointreau e grenadine na coqueteleira com gelo.","Agite por 10s e coe em copo de margarita ou rocks com gelo.","Complete com ginger beer e sirva."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Hemingway Daiquiri Cordial",categories:["Luxardo Maraschino","Rum","Sour","Shaken"],ingredients:["60 ml rum branco","10 ml Luxardo Maraschino","20 ml suco de limão","10–15 ml cordial de toranja (no lugar do suco)"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 15s.","Coe em taça de coquetel gelada."],notes:"Variação com cordial de toranja no lugar do suco — mais concentrado e com os óleos da casca. Luxardo reduzido para 10 ml para preservar o caráter seco. Quer mais seco: reduza mais o Luxardo. Quer mais cítrico: aumente o limão, não o cordial.",rating:0,servings:"1",custom:false},
  {name:"Hemingway Daiquiri",categories:["Luxardo Maraschino","Rum","Sour","Shaken"],ingredients:["60 ml rum branco","15 ml Luxardo Maraschino","20 ml suco de limão","15 ml suco de grapefruit"],steps:["Agite rum, Maraschino, limão e grapefruit com gelo por 15s.","Coe em taça de coquetel gelada."],notes:"Criado para Ernest Hemingway, que preferia drinks menos doces. Seco, cítrico e com fundo floral.",rating:0,servings:"",custom:false},
  {name:"Highball de Luxardo",categories:["Highball","Luxardo Maraschino","Built"],ingredients:["30 ml Luxardo","10 ml limão Tahiti","água com gás para completar","gelo"],steps:["Esprema o limão no copo. Encha com gelo.","Adicione o Luxardo.","Complete com água com gás. Mexa suavemente."],notes:"Super leve, quase um refrigerante adulto. Perfeito pra calor.",rating:0,servings:"",custom:false},
  {name:"Hurricane",categories:["Rum Envelhecido","Sling","Shaken"],ingredients:["60 ml rum escuro da Jamaica","30 ml xarope de maracujá","15 ml suco de limão","cereja para decorar"],steps:["Agite tudo com gelo.","Coe em copo alto com gelo picado.","Decore com limão e cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Jamaica Ginger",categories:["Rum Envelhecido","Shaken"],ingredients:["2 partes Rum escuro da Jamaica","1 parte groselha","3 dashes Curaçao de laranja","1 dash bitter"],steps:["Agite com gelo e coe em taça de coquetel."],notes:"",rating:0,servings:"",custom:false},
  {name:"Jasmine (Casa do Porco)",categories:["Campari","Triple Sec","Gim","Sour","Shaken"],ingredients:["45 ml Gim","15 ml Campari","15 ml Cointreau","20 ml suco de limão"],steps:["Agite todos os ingredientes com gelo por 15s.","Coe em taça de coquetel gelada.","Decore com casca de limão."],notes:"Cítrico, amargo e seco. Um sour sofisticado com alma italiana.",rating:0,servings:"1",custom:false},
  {name:"Jus dinger",categories:["Não alcóolicos"],ingredients:["500g gengibre","3 polpas maracujá","2 polpas seriguela","2 polpas cajá","Açúcar orgânico","1 ramo hortelã","⅓ noz-moscada","flor de laranjeira"],steps:["Bata o gengibre com água e peneire.","Misture com as polpas e açúcar.","Adicione noz-moscada e flor de laranjeira."],notes:"",rating:0,servings:"6",custom:false},
  {name:"Lavender Gim Sour",categories:["Gim","Sour","Shaken"],ingredients:["50 ml Gim","20 ml xarope de lavanda","25 ml suco de limão","7,5 ml creme de leite fresco","7,5 ml xarope de violeta","1 clara de ovo"],steps:["Dry shake por 15s.","Adicione gelo e agite por mais 15s.","Coe em taça coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Licor Beirão Sour",categories:["Licor Beirão","Sour","Shaken"],ingredients:["50 ml Licor Beirão","25 ml limão","15 ml açúcar","clara de ovo"],steps:["Dry shake todos os ingredientes por 10s sem gelo.","Adicione gelo e agite com força por mais 15s.","Coe em taça coupe. Decore com raspa de limão."],notes:"Herbal, cítrico e com textura aveludada. O mais elegante dos sours portugueses.",rating:0,servings:"",custom:false},
  {name:"Manhattan",categories:["Luxardo Maraschino","Vermute Tinto","Whisky","Stirred"],ingredients:["60 ml whisky de centeio","30 ml vermute tinto doce","2 dashes bitter","cereja para decorar"],steps:["Mexa com gelo em copo misturador.","Coe em taça de coquetel.","Decore com cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Manhattan (Perfect)",categories:["Vermute Branco","Vermute seco","Whisky","Stirred"],ingredients:["60 ml whisky de centeio","15 ml vermute seco","15 ml vermute doce","2 dashes bitter","cereja e limão para decorar"],steps:["Mexa com gelo. Coe em taça. Decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Manhattan com cereja de verdade",categories:["Luxardo Maraschino","Vermute Tinto","Whisky","Stirred"],ingredients:["50 ml whisky (centeio fica lindo)","25 ml Vermute rosso","5 ml Luxardo Maraschino","2 dashes Angostura"],steps:["Mexa tudo com gelo em copo misturador.","Coe em taça gelada.","Decore com cereja Luxardo."],notes:"O Luxardo não grita — ele sussurra e melhora tudo.",rating:0,servings:"1",custom:false},
  {name:"Highball de Luxardo com Whisky",categories:["Whisky","Luxardo Maraschino","Highball","Built"],ingredients:["40 ml whisky","7 ml Luxardo Maraschino","5 ml suco de limão siciliano","água com gás bem gelada","casca de laranja"],steps:["Copo alto com bastante gelo.","Adicione whisky, Luxardo e limão.","Complete com água com gás.","Mexa suavemente.","Expresse a casca de laranja por cima e jogue dentro."],notes:"O Luxardo entra como cereja sofisticada — quase um eco de amêndoa. A água com gás transforma isso em algo bebível por horas.",rating:0,servings:"1",custom:false},
  {name:"Highball Inesperado",categories:["Whisky","Luxardo Maraschino","Highball","Built"],ingredients:["40 ml whisky","7 ml Luxardo Maraschino","água com gás","casca de laranja"],steps:["Copo alto com gelo.","Adicione whisky e Luxardo.","Complete com água com gás.","Expresse a casca de laranja por cima."],notes:"Refrescante, leve, quase perigoso de tão fácil de beber.",rating:0,servings:"1",custom:false},
  {name:"Improved Whiskey Cocktail",categories:["Whisky","Luxardo Maraschino","Stirred"],ingredients:["50 ml whisky (bourbon ou centeio)","5 ml Luxardo Maraschino","5 ml xarope simples","2 dashes Angostura","twist de limão"],steps:["Misture whisky, Luxardo, xarope e Angostura com gelo.","Mexa bem e coe em rocks com gelo.","Expresse o twist de limão e coloque no copo."],notes:"É tipo um Old Fashioned que decidiu usar um perfume italiano.",rating:0,servings:"1",custom:false},
  {name:"Maraschino Spritz",categories:["Espumante","Luxardo Maraschino","Spritz","Built"],ingredients:["40 ml Luxardo Maraschino","80 ml espumante brut","40 ml água com gás","rodela de laranja ou limão"],steps:["Encha taça com gelo.","Adicione o Luxardo.","Complete com espumante e água com gás. Mexa. Decore com rodela de laranja."],notes:"Leve, levemente doce e com fundo elegante de amêndoa. Um aperitivo sofisticado.",rating:0,servings:"",custom:false},
  {name:"Margarita",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["50 ml Tequila","25 ml suco de limão","25 ml Triple Sec","sal na borda (opcional)"],steps:["Agite tudo com gelo.","Coe em taça com borda de sal."],notes:"",rating:0,servings:"",custom:false},
  {name:"Martinez",categories:["Gim","Luxardo Maraschino","Vermute Tinto","Stirred"],ingredients:["45 ml gim","45 ml Vermute rosso","5 ml Luxardo Maraschino","2 dashes Angostura"],steps:["Mexa com gelo e coe."],notes:"O ancestral direto do Martini.",rating:0,servings:"",custom:false},
  {name:"Mojito",categories:["Rum","Smash","Built"],ingredients:["40 ml rum","30 ml suco de limão","2 col. sobremesa açúcar","10 folhas hortelã","água com gás","Gelo"],steps:["Macere hortelã, açúcar e limão no copo.","Adicione gelo e rum.","Complete com água gaseificada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mojito Amendoado",categories:["Rum","Smash","Built"],ingredients:["50 ml rum branco","10 folhas hortelã","20 ml limão taiti","20 ml xarope de amêndoa","Tônica de gengibre Britvic"],steps:["Bata tudo exceto a tônica.","Adicione a tônica ao final."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mojito de framboesa",categories:["Rum","Smash","Built"],ingredients:["½ limão","5-6 framboesas","10-12 folhas hortelã","1 col. açúcar","2 doses rum claro","club soda"],steps:["Macere limão, framboesa, hortelã e açúcar.","Adicione gelo e rum. Complete com soda."],notes:"",rating:0,servings:"",custom:false},
  {name:"Moscow Mule",categories:["Vodka","Highball","Buck","Built"],ingredients:["60 ml Vodka","20 ml suco de limão","90 ml cerveja de gengibre","1 rodela limão"],steps:["Encha o caneco com gelo.","Adicione vodka e limão.","Complete com ginger beer. Decore."],notes:"Copo de cobre",rating:0,servings:"",custom:false},
  {name:"Mr. Grinch",categories:["Tequila","Sour","Shaken"],ingredients:["60 ml tequila ou mezcal","30 ml suco de pepino","15 ml xarope de jalapeño","10 ml suco de limão"],steps:["Bata tudo com gelo. Sirva com hortelã."],notes:"",rating:0,servings:"",custom:false},
  {name:"Negroni",categories:["Campari","Gim","Vermute Tinto","Stirred"],ingredients:["30 ml Gim","30 ml Campari","30 ml Vermute tinto"],steps:["Adicione gelo no copo.","Adicione os três ingredientes em partes iguais.","Mexa e decore com casca de laranja."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Negroni Sbagliato",categories:["Campari","Espumante","Spritz","Vermute Tinto","Built"],ingredients:["30 ml Campari","30 ml Vermute rosso","prosecco para completar"],steps:["Encha copo rocks com gelo.","Adicione Campari e Vermute rosso.","Complete com prosecco pela lateral. Mexa levemente.","Decore com casca de laranja."],notes:"Amargo, herbáceo e mais leve que o Negroni tradicional. As borbulhas suavizam o amargor.",rating:0,servings:"",custom:false},
  {name:"Old Fashioned",categories:["Whisky","Stirred"],ingredients:["60 ml Bourbon","2 dashes Bitter","1 cubo açúcar","casca de laranja"],steps:["Macere açúcar e bitter no copo.","Adicione gelo e bourbon.","Mexa e decore com laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Pisco Elderflower Sour",categories:["Pisco","St‑Germain","Sour","Shaken"],ingredients:["50 ml pisco","20 ml St-Germain","20 ml limão","clara de ovo","angostura"],steps:["Dry shake pisco, St-Germain, limão e clara sem gelo por 10s.","Adicione gelo e agite por mais 15s.","Coe em taça coupe. Pingue angostura na espuma."],notes:"Floral, cítrico e suave. O pisco com sabugueiro forma uma combinação delicada e elegante.",rating:0,servings:"",custom:false},
  {name:"Pisco Sour",categories:["Pisco","Sour","Shaken"],ingredients:["45 ml pisco","30 ml suco limão Taiti","20 ml xarope de açúcar","1 clara","Gelo","Bitter Angostura"],steps:["Agite tudo por 30-45s.","Coe e pingue 1-2 gotas de bitter."],notes:"",rating:0,servings:"",custom:false},
  {name:"Sazerac",categories:["Conhaque","Stirred"],ingredients:["60 ml Conhaque","5 ml xarope simples","3 dashes Absinto","2 dashes Peychaud's bitters","casca de limão"],steps:["Passe o absinto no copo e descarte o excesso.","Adicione conhaque, xarope e bitters com gelo. Mexa.","Coe no copo preparado. Decore com limão."],notes:"",rating:0,servings:"",custom:false},
  {name:"SAZERAC por Kennedy Nascimento",categories:["Conhaque","Whisky","Stirred"],ingredients:["30 ml cognac VSOP","30 ml bourbon ou centeio","1 torrão açúcar","Spray de Absinto","4 dashes Peychaud's","2 dashes angostura","Zest limão siciliano"],steps:["Suje o copo com absinto e reserve com gelo.","Macere açúcar com bitters no mixing glass. Adicione cognac e mexa.","Retire o gelo, verta o drink. Decore com zest."],notes:"",rating:0,servings:"",custom:false},
  {name:"Sevilla Sour",categories:["Gim","St‑Germain","Sour","Shaken"],ingredients:["50 ml Flor de Sevilla","20 ml St-Germain","25 ml limão siciliano","10 ml xarope simples","clara de ovo (opcional)"],steps:["Dry shake todos os ingredientes por 10s sem gelo.","Adicione gelo e agite por mais 15s.","Coe em taça coupe."],notes:"Cítrico, floral e levemente amargo. O gim Flor de Sevilla traz laranja e complexidade naturais.",rating:0,servings:"",custom:false},
  {name:"Shanksjillo",categories:["Triple Sec","Pisco","Whisky","Shaken"],ingredients:["1 dose Shanky's","1 dose Cointreau","1 xícara café expresso"],steps:["Combine Shanky's, Cointreau e café expresso gelado na coqueteleira com gelo.","Agite vigorosamente por 15s até espumar.","Coe duplo em taça de coquetel gelada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Smoked Apple Whiskey Tonic",categories:["Whisky","Highball","Built"],ingredients:["60 ml Apple Whiskey (Jack Daniel's)","120 ml suco de maçã","Água Tônica","Canela e alecrim"],steps:["Defume o copo com canela por 1-2 min.","Adicione gelo, whiskey, suco de maçã e tônica."],notes:"",rating:0,servings:"",custom:false},
  {name:"Smokey Martini",categories:["Gim","Stirred"],ingredients:["60 ml Gim","toque de whisky defumado","raspa de limão"],steps:["Mexa gim e whisky defumado com gelo em copo misturador por 30s.","Coe em taça de coquetel gelada.","Expresse a raspa de limão sobre a taça e descarte."],notes:"Seco, aromático e com fundo esfumaçado. Um Martini com personalidade.",rating:0,servings:"",custom:false},
  {name:"Spring Martini",categories:["Gim","Luxardo Maraschino","St‑Germain","Stirred"],ingredients:["60 ml gim","10 ml St-Germain","5 ml Maraschino"],steps:["Mexa gim, St-Germain e Maraschino com gelo em copo misturador por 30s.","Coe em taça de coquetel gelada.","Decore com casca de limão siciliano."],notes:"Seco com notas florais de sabugueiro e amêndoa. Um Martini de primavera.",rating:0,servings:"",custom:false},
  {name:"St‑Germain Hugo Spritz",categories:["St‑Germain","Spritz","Espumante","Built"],ingredients:["40 ml St‑Germain","60 ml espumante","60 ml água com gás","8-10 folhas hortelã","1 fatia limão taiti"],steps:["Adicione as folhas de hortelã ao copo e cubra com gelo.","Adicione o St-Germain.","Complete com espumante e água com gás. Mexa suavemente.","Decore com fatia de limão."],notes:"Floral, refrescante e levemente herbáceo. O aperitivo italiano feito para dias quentes.",rating:0,servings:"",custom:false},
  {name:"St‑Germain Spritz",categories:["St‑Germain","Spritz","Espumante","Built"],ingredients:["40 ml St‑Germain","60 ml espumante brut","60 ml água com gás","casca limão siciliano"],steps:["Encha taça com gelo.","Adicione o St-Germain.","Complete com espumante e água com gás. Mexa.","Decore com casca de limão siciliano."],notes:"Elegante e floral, com borbulhas finas. Aperitivo leve e aromático.",rating:0,servings:"",custom:false},
  {name:"The Clover Club",categories:["Gim","Sour","Shaken"],ingredients:["45 ml Gim","20 ml suco de limão","15 ml xarope simples","4 framboesas","1 clara de ovo"],steps:["Agite tudo sem gelo por 15s.","Adicione gelo e agite por mais 15s.","Coe sem gelo."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Tom Collins (20's B)",categories:["Gim","Collins","Vermute Branco","Built"],ingredients:["45 ml gim","15 ml Vermute branco","20 ml suco de limão","5 ml xarope simples (opcional)","2 dashes Angostura","1 fatia de pepino (opcional)","soda para completar"],steps:["Combine gim, Vermute branco, limão e xarope com gelo.","Complete com soda.","Adicione Angostura e decore com pepino."],notes:"Uma versão dos anos 20 do Collins — o Vermute branco no lugar do açúcar puro dá mais profundidade e menos doce.",rating:0,servings:"1",custom:false},
  {name:"Whiskey Mule de Romã",categories:["Whisky","Highball","Buck","Built"],ingredients:["60 ml whiskey","15 ml suco de limão","15 ml grenadine de romã","3 gotas bitter de laranja","cerveja de gengibre"],steps:["Misture tudo e complete com ginger beer."],notes:"",rating:0,servings:"",custom:false},
  {name:"Whiskey Sour",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml Uísque","30 ml suco de lima","22 ml xarope simples","1 clara de ovo","alecrim tostado"],steps:["Agite com gelo. Coe em rocks cheio de gelo.","Decore com cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"White Russian de abóbora",categories:["Vodka","Licor","Built"],ingredients:["60 ml vodka","60 ml Kahlúa","30 ml creme de leite batido com geleia de abóbora"],steps:["Coloque gelo num copo rocks.","Despeje a vodka e o Kahlúa sobre o gelo.","Bata levemente o creme com a geleia de abóbora e despeje por cima, deixando flutuante."],notes:"",rating:0,servings:"",custom:false},
  {name:"Daiquiri",categories:["Rum","Sour","Shaken"],ingredients:["60 ml rum branco","30 ml suco de limão fresco","22 ml xarope simples"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 15s.","Coe em taça coupe gelada."],notes:"Simples e brilhante. A qualidade do rum faz toda a diferença.",rating:0,servings:"1",custom:false},
  {name:"Cosmopolitan",categories:["Vodka","Triple Sec","Sour","Shaken"],ingredients:["45 ml vodka","15 ml Cointreau","30 ml suco de cranberry","15 ml suco de limão"],steps:["Combine tudo com gelo.","Agite e coe em taça. Decore com casca de laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Gimlet",categories:["Gim","Sour","Shaken"],ingredients:["60 ml gim","20 ml cordial de limão","10 ml suco de limão fresco"],steps:["Combine na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"Com cordial Rose's fica mais doce. Com suco fresco fica mais vivo.",rating:0,servings:"",custom:false},
  {name:"Americano",categories:["Campari","Vermute Tinto","Highball","Built"],ingredients:["30 ml Campari","30 ml vermute tinto doce","Água com gás","Casca de laranja"],steps:["Adicione Campari e vermute num copo com gelo.","Complete com água com gás.","Decore com casca de laranja."],notes:"O avô do Negroni. Mais leve e acessível.",rating:0,servings:"",custom:false},
  {name:"Boulevardier",categories:["Campari","Whisky","Vermute Tinto","Stirred"],ingredients:["45 ml bourbon","30 ml Campari","30 ml vermute tinto doce"],steps:["Mexa tudo com gelo por 30s.","Coe em taça ou rocks. Decore com laranja."],notes:"O Negroni com bourbon. Mais encorpado e quente.",rating:0,servings:"",custom:false},
  {name:"Rob Roy",categories:["Whisky","Vermute Tinto","Stirred"],ingredients:["60 ml Scotch whisky","30 ml vermute tinto doce","2 dashes Angostura","cereja marrasquino"],steps:["Mexa com gelo e coe em taça. Decore com cereja."],notes:"Manhattan escocês.",rating:0,servings:"",custom:false},
  {name:"Vieux Carré",categories:["Conhaque","Whisky","Vermute Tinto","Stirred"],ingredients:["22 ml cognac","22 ml whisky de centeio","22 ml vermute tinto doce","1 dash Angostura","1 dash Peychaud's","5 ml Bénédictine"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo. Decore com laranja."],notes:"Um clássico de Nova Orleans. Complexo e equilibrado.",rating:0,servings:"",custom:false},
  {name:"Amaretto Sour",categories:["Amaretto","Sour","Shaken"],ingredients:["60 ml Amaretto","30 ml suco de limão","20 ml bourbon","1 clara de ovo","2 dashes Angostura"],steps:["Dry shake por 15s.","Adicione gelo e agite por mais 15s.","Coe em rocks. Decore com cereja e laranja."],notes:"O bourbon equilibra o doce do Amaretto.",rating:0,servings:"",custom:false},
  {name:"New York Sour",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml bourbon ou centeio","30 ml suco de limão","22 ml xarope simples","1 clara de ovo","float de vinho tinto seco"],steps:["Dry shake tudo exceto o vinho.","Adicione gelo e agite. Coe em rocks.","Despeje o vinho tinto sobre o dorso de uma colher para criar o float."],notes:"O float de vinho cria uma camada visual impressionante.",rating:0,servings:"",custom:false},
  {name:"Espresso Martini",categories:["Vodka","Licor","Shaken"],ingredients:["50 ml vodka","30 ml licor de café (Kahlúa)","30 ml espresso fresco","5 ml xarope simples"],steps:["Prepare o espresso e deixe esfriar brevemente.","Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 15s — o shake forte cria a espuma.","Coe em taça coupe gelada. Decore com 3 grãos de café."],notes:"O espresso fresco (não frio) faz toda a diferença na espuma.",rating:0,servings:"1",custom:false},
  {name:"Sidecar",categories:["Conhaque","Triple Sec","Sour","Shaken"],ingredients:["50 ml conhaque","25 ml Cointreau","25 ml suco de limão siciliano","açúcar na borda (opcional)"],steps:["Prepare a borda da taça com açúcar.","Combine tudo com gelo e agite.","Coe em taça coupe."],notes:"Proporção clásica 2:1:1. Com mais limão fica mais seco.",rating:0,servings:"1",custom:false},
  {name:"Bee's Knees",categories:["Gim","Sour","Shaken"],ingredients:["60 ml gim","25 ml suco de limão","22 ml xarope de mel"],steps:["Combine tudo com gelo e agite bem.","Coe em taça coupe gelada.","Decore com casca de limão."],notes:"O xarope de mel: dissolva mel em água quente na proporção 1:1.",rating:0,servings:"1",custom:false},
  {name:"Last Word",categories:["Gim","Luxardo Maraschino","Licor","Sour","Shaken"],ingredients:["22 ml gim","22 ml Green Chartreuse","22 ml Luxardo Maraschino","22 ml suco de limão"],steps:["Combine em partes iguais com gelo.","Agite e coe em taça coupe."],notes:"Partes iguais. Um dos drinks mais equilibrados da história.",rating:0,servings:"1",custom:false},
  {name:"Penicillin",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml blended scotch","22 ml suco de limão","22 ml xarope de mel e gengibre","float de scotch defumado (Islay)"],steps:["Agite o scotch, limão e xarope com gelo.","Coe em rocks com gelo.","Despeje o scotch defumado por cima no dorso de uma colher.","Decore com gengibre cristalizado."],notes:"O xarope: ferva mel, gengibre fatiado e água. O float defumado é o ponto.",rating:0,servings:"1",custom:false},
  {name:"Gold Rush",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml bourbon","22 ml suco de limão","22 ml xarope de mel"],steps:["Combine tudo com gelo e agite.","Coe em rocks com gelo grande."],notes:"Primo do Bee's Knees. O mel suaviza o bourbon perfeitamente.",rating:0,servings:"1",custom:false},
  {name:"Cuba Libre",categories:["Rum","Highball","Built"],ingredients:["50 ml rum branco ou dourado","150 ml cola","15 ml suco de limão","fatia de limão"],steps:["Encha o copo com gelo.","Adicione o rum e o limão.","Complete com cola pela lateral. Mexa uma vez. Decore."],notes:"A diferença para o rum com cola é o limão — não pule.",rating:0,servings:"1",custom:false},
  {name:"Paper Plane",categories:["Whisky","Aperol","Sour","Shaken"],ingredients:["22 ml bourbon","22 ml Aperol","22 ml Amaro Nonino","22 ml suco de limão"],steps:["Combine em partes iguais com gelo.","Agite e coe em taça coupe."],notes:"Partes iguais. Moderno clássico de Sam Ross (2008).",rating:0,servings:"1",custom:false},
  {name:"Singapore Sling",categories:["Gim","Triple Sec","Sling","Shaken"],ingredients:["45 ml gim","15 ml Cherry Heering","7 ml Cointreau","7 ml Bénédictine","120 ml suco de abacaxi","15 ml suco de limão","10 ml grenadine","1 dash Angostura"],steps:["Combine tudo com gelo e agite.","Coe em copo Collins com gelo.","Decore com cereja e fatia de abacaxi."],notes:"Criado no Raffles Hotel, Singapura, c. 1915.",rating:0,servings:"1",custom:false},
  {name:"Mimosa",categories:["Espumante","Spritz","Built"],ingredients:["75 ml espumante brut gelado","75 ml suco de laranja fresco"],steps:["Despeje o suco na flute.","Complete com espumante gelado. Não mexa."],notes:"Proporção 1:1. O suco de laranja fresco é essencial.",rating:0,servings:"1",custom:false},
  {name:"Bellini",categories:["Espumante","Spritz","Built"],ingredients:["100 ml prosecco gelado","50 ml purê de pêssego fresco"],steps:["Coloque o purê na flute.","Complete com prosecco gelado devagar. Mexa suavemente."],notes:"Original do Harry's Bar, Veneza. Com pêssego branco fica mais elegante.",rating:0,servings:"1",custom:false},
  {name:"Kir Royale",categories:["Espumante","Licor","Spritz","Built"],ingredients:["120 ml champagne ou espumante brut","15 ml crème de cassis"],steps:["Coloque o cassis na flute.","Complete com champagne gelado."],notes:"Com vinho branco tranquilo vira Kir simples. O cassis deve ser de qualidade.",rating:0,servings:"1",custom:false},
  {name:"Tommy's Margarita",categories:["Tequila","Sour","Shaken"],ingredients:["60 ml tequila 100% agave","30 ml suco de limão","15 ml xarope de agave"],steps:["Combine tudo com gelo e agite.","Coe em rocks com gelo. Borda de sal opcional."],notes:"Criado por Julio Bermejo. Sem triple sec — o agave deixa a tequila brilhar.",rating:0,servings:"1",custom:false},
  {name:"Caipiroska",categories:["Vodka","Smash","Built"],ingredients:["60 ml vodka","1 limão taiti","2 col. chá açúcar","gelo picado"],steps:["Corte o limão em 4 e macere com açúcar no copo.","Adicione gelo picado e a vodka.","Mexa vigorosamente."],notes:"A versão vodka da caipirinha. Mais suave e neutra.",rating:0,servings:"1",custom:false},
  {name:"White Russian",categories:["Vodka","Licor","Built"],ingredients:["50 ml vodka","25 ml Kahlúa","25 ml creme de leite fresco"],steps:["Coloque gelo em rocks.","Adicione vodka e Kahlúa.","Despeje o creme por cima devagar — sem mexer para criar camada."],notes:"Sem creme vira Black Russian.",rating:0,servings:"1",custom:false},
  {name:"Frozen Daiquiri",categories:["Rum","Sour","Shaken"],ingredients:["60 ml rum branco","30 ml suco de limão","22 ml xarope simples","1 xícara gelo picado"],steps:["Bata tudo no liquidificador até ficar homogêneo.","Sirva em taça de coquetel gelada."],notes:"A consistência certa é cremosa, não aguada. Ajuste o gelo.",rating:0,servings:"1",custom:false},
  {name:"Frozen Margarita",categories:["Tequila","Triple Sec","Sour","Shaken"],ingredients:["60 ml tequila","30 ml Cointreau","30 ml suco de limão","1 xícara gelo picado","sal na borda"],steps:["Prepare a borda com sal.","Bata tudo no liquidificador até ficar cremoso.","Sirva na taça preparada."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Mezcal Negroni",categories:["Mezcal","Campari","Vermute Tinto","Stirred"],ingredients:["30 ml mezcal","30 ml Campari","30 ml vermute tinto doce"],steps:["Mexa tudo com gelo por 30s.","Coe em rocks. Decore com casca de laranja."],notes:"O mezcal defumado transforma o Negroni. Use um mezcal com presença mas sem dominar.",rating:0,servings:"1",custom:false},
  {name:"Oaxacan Old Fashioned",categories:["Mezcal","Whisky","Stirred"],ingredients:["45 ml tequila reposado","15 ml mezcal","15 ml xarope de agave","2 dashes mole bitters (ou Angostura)","casca de laranja"],steps:["Combine tudo com gelo e mexa por 30s.","Coe em rocks com gelo grande.","Flambe a casca de laranja por cima. Decore."],notes:"Criado por Phil Ward no Death & Co, NYC. O equilíbrio tequila/mezcal é o ponto.",rating:0,servings:"1",custom:false},
  {name:"Paloma Cordial",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","35 ml cordial de toranja","15 ml suco de limão taiti","pitada de sal","gotas de pimenta a gosto","água com gás para completar"],steps:["Coloque gelo em copo alto.","Adicione a tequila, o cordial de toranja e o suco de limão.","Tempere com sal e gotas de pimenta.","Complete com água com gás e mexa suavemente."],notes:"Versão com cordial caseiro de toranja no lugar do suco — mais concentrado e com os óleos da casca. A pimenta aparece no final.",rating:0,servings:"1",custom:false},
  {name:"Paloma",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","15 ml suco de limão","suco de toranja para completar","sal na borda (opcional)"],steps:["Prepare a borda com sal.","Adicione gelo, tequila e limão.","Complete com suco de toranja. Decore."],notes:"No México é mais popular que a Margarita.",rating:0,servings:"",custom:false},
  {name:"Tequila Sunrise",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","120 ml suco de laranja","15 ml grenadine"],steps:["Encha com gelo. Adicione tequila e suco de laranja.","Despeje a grenadine devagar pela lateral — ela afunda criando o degradê."],notes:"Não mexa depois da grenadine — o efeito é o ponto.",rating:0,servings:"",custom:false},
  {name:"Piña Colada",categories:["Rum","Shaken"],ingredients:["60 ml rum branco","90 ml suco de abacaxi","45 ml creme de coco"],steps:["Agite tudo com gelo e coe.","Ou bata no liquidificador para a versão frozen.","Decore com abacaxi e cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mai Tai",categories:["Rum","Sour","Shaken"],ingredients:["60 ml rum envelhecido","15 ml curaçao laranja","15 ml orgeat (xarope de amêndoa)","30 ml suco de limão"],steps:["Agite tudo com gelo.","Coe em rocks com gelo. Decore com hortelã e cereja."],notes:"Um clássico tiki. O orgeat é indispensável.",rating:0,servings:"",custom:false},
  {name:"Jungle Bird",categories:["Rum Envelhecido","Campari","Sour","Shaken"],ingredients:["45 ml rum escuro","22 ml Campari","15 ml Luxardo Maraschino","15 ml suco de limão","45 ml suco de abacaxi"],steps:["Agite tudo com gelo.","Coe em rocks. Decore com abacaxi."],notes:"O único clássico tiki com amaro. Surpreendente.",rating:0,servings:"",custom:false},
  {name:"Irish Coffee",categories:["Whisky","Hot"],ingredients:["40 ml Irish whiskey","120 ml café quente","15 ml xarope simples","creme de leite levemente batido"],steps:["Aqueça a taça. Adicione whiskey e xarope.","Complete com café quente e mexa.","Despeje o creme por cima passando pelo dorso de uma colher."],notes:"O creme deve flutuar. Beba o café através do creme.",rating:0,servings:"",custom:false},
  {name:"Hot Toddy",categories:["Whisky","Hot"],ingredients:["60 ml whisky","25 ml mel","25 ml suco de limão","150 ml água quente","pau de canela","cravos"],steps:["Coloque mel, limão e especiarias na caneca.","Adicione o whisky.","Complete com água quente e mexa."],notes:"Perfeito para dias frios.",rating:0,servings:"",custom:false},
  {name:"Black Russian",categories:["Vodka","Licor","Stirred"],ingredients:["50 ml vodka","25 ml Kahlúa"],steps:["Coloque gelo em rocks.","Adicione vodka e Kahlúa. Mexa."],notes:"Com creme de leite vira White Russian.",rating:0,servings:"",custom:false},
  {name:"Godfather",categories:["Whisky","Stirred"],ingredients:["45 ml Scotch whisky","25 ml Amaretto"],steps:["Coloque gelo em rocks.","Adicione e mexa suavemente."],notes:"Com vodka vira Godmother.",rating:0,servings:"",custom:false},
  {name:"Ramos Gim Fizz",categories:["Gim","Fizz","Shaken"],ingredients:["60 ml gim","15 ml suco de limão","15 ml suco de lima","30 ml creme de leite","1 clara de ovo","22 ml xarope simples","3 gotas água de flor de laranjeira","soda"],steps:["Dry shake TODOS os ingredientes por 2 minutos (sim, 2 min!).","Adicione gelo e agite por mais 1 minuto.","Coe em Collins sem gelo. Complete com soda."],notes:"O shake longo é o segredo da textura aerada.",rating:0,servings:"",custom:false},
  {name:"Vodka Tônica",categories:["Vodka","Highball","Built"],ingredients:["50 ml vodka","150 ml água tônica","rodela de limão"],steps:["Encha com gelo. Adicione vodka.","Complete com tônica pela lateral. Decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Caipirinha",categories:["Cachaça","Smash","Built"],ingredients:["60 ml cachaça","1 limão taiti","2 col. chá açúcar","gelo picado"],steps:["Corte o limão em 4 pedaços e macere com açúcar no copo.","Adicione gelo picado e a cachaça.","Mexa vigorosamente."],notes:"A proporção do limão e açúcar é o segredo.",rating:0,servings:"",custom:false},

  // ── CACHAÇA ──
  {name:"Batida de Coco",categories:["Cachaça","Shaken"],ingredients:["60 ml cachaça","100 ml leite de coco","30 ml leite condensado","gelo"],steps:["Bata tudo na coqueteleira ou liquidificador.","Sirva em copo alto com gelo."],notes:"Pode usar coco fresco ralado para decorar.",rating:0,servings:"",custom:false},
  {name:"Batida de Maracujá",categories:["Cachaça","Shaken"],ingredients:["60 ml cachaça","80 ml suco de maracujá","30 ml leite condensado","gelo"],steps:["Bata tudo na coqueteleira.","Sirva em copo alto com gelo."],notes:"",rating:0,servings:"",custom:false},
  {name:"Cachaça Sour",categories:["Cachaça","Sour","Shaken"],ingredients:["60 ml cachaça","25 ml suco de limão","20 ml xarope simples","1 clara de ovo (opcional)"],steps:["Dry shake se usar clara.","Adicione gelo e agite.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Quentão",categories:["Cachaça","Hot"],ingredients:["500 ml cachaça","500 ml água","200 g açúcar","5 cravos","3 paus de canela","1 laranja em rodelas","gengibre a gosto"],steps:["Leve tudo ao fogo baixo até dissolver o açúcar.","Deixe ferver levemente por 10 min.","Sirva quente."],notes:"Clássico junino.",rating:0,servings:"6",custom:false},
  {name:"Rabo de Galo",categories:["Cachaça","Stirred"],ingredients:["50 ml cachaça","25 ml Cynar","1 dash Angostura","casca de laranja"],steps:["Mexa todos os ingredientes com gelo.","Coe em rocks com gelo.","Expresse a casca de laranja."],notes:"O Negroni brasileiro.",rating:0,servings:"",custom:false},
  {name:"Leite de Onça",categories:["Cachaça","Stirred"],ingredients:["50 ml cachaça","50 ml leite de coco","30 ml leite condensado","canela em pó"],steps:["Misture tudo com gelo.","Sirva em copo e finalize com canela."],notes:"Drink típico de festas juninas.",rating:0,servings:"",custom:false},
  {name:"Caju Amigo",categories:["Cachaça","Highball","Built"],ingredients:["50 ml cachaça","150 ml suco de caju","15 ml suco de limão","gelo"],steps:["Combine tudo em copo alto com gelo.","Mexa e sirva."],notes:"",rating:0,servings:"",custom:false},

  // ── COGNAC / BRANDY ──
  {name:"Brandy Alexander",categories:["Conhaque","Shaken"],ingredients:["30 ml conhaque","30 ml creme de cacau escuro","30 ml creme de leite fresco","noz-moscada"],steps:["Bata tudo com gelo.","Coe em taça coupe.","Finalize com noz-moscada ralada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Between the Sheets",categories:["Conhaque","Rum","Triple Sec","Sour","Shaken"],ingredients:["30 ml conhaque","30 ml rum branco","30 ml Cointreau","15 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em taça coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Stinger",categories:["Conhaque","Licor","Stirred"],ingredients:["60 ml conhaque","20 ml creme de menta branco"],steps:["Mexa com gelo.","Coe em coupe ou sirva em rocks com gelo britado."],notes:"",rating:0,servings:"",custom:false},
  {name:"French Connection",categories:["Conhaque","Stirred"],ingredients:["45 ml conhaque","25 ml Amaretto"],steps:["Coloque gelo em rocks.","Adicione e mexa suavemente."],notes:"",rating:0,servings:"",custom:false},

  // ── TEQUILA / MEZCAL ──
  {name:"Spicy Margarita",categories:["Tequila","Triple Sec","Sour","Shaken"],ingredients:["60 ml tequila blanco","30 ml suco de limão","20 ml Cointreau","3 rodelas jalapeño","sal na borda"],steps:["Macere o jalapeño com a tequila.","Bata com os demais ingredientes e gelo.","Coe na borda salgada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Ranch Water",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila blanco","30 ml suco de limão","150 ml água com gás (Topo Chico)"],steps:["Combine em copo alto com gelo.","Mexa delicadamente."],notes:"Clássico do Texas, simples e refrescante.",rating:0,servings:"",custom:false},
  {name:"Batanga",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","30 ml suco de limão","Coca-Cola para completar","sal"],steps:["Borda o copo com sal.","Adicione gelo, limão e tequila.","Complete com Coca-Cola. Mexa com faca de cozinha."],notes:"Don Javier Delgado Corona, La Capilla, Tequila.",rating:0,servings:"",custom:false},
  {name:"Naked and Famous",categories:["Mezcal","Licor","Sour","Shaken"],ingredients:["22 ml mezcal","22 ml Aperol","22 ml Yellow Chartreuse","22 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Variação do Paper Plane com mezcal.",rating:0,servings:"",custom:false},
  {name:"Mezcal Sour",categories:["Mezcal","Sour","Shaken"],ingredients:["60 ml mezcal","25 ml suco de limão","20 ml xarope de agave","1 clara de ovo"],steps:["Dry shake sem gelo.","Adicione gelo e agite.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Matador",categories:["Tequila","Sour","Shaken"],ingredients:["45 ml tequila","90 ml suco de abacaxi","15 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em coupe ou sirva com gelo."],notes:"",rating:0,servings:"",custom:false},
  {name:"Agave Spritz",categories:["Tequila","Highball","Built"],ingredients:["50 ml tequila blanco","20 ml suco de limão siciliano","15 ml xarope de agave","água com gás para completar","rodela de laranja"],steps:["Adicione gelo em copo alto.","Despeje a tequila, o limão e o xarope de agave.","Complete com água com gás.","Decore com rodela de laranja e mexa levemente."],notes:"Leve, cítrico e refrescante. Mais elegante que parece.",rating:0,servings:"1",custom:false},
  {name:"Verde Brisa",categories:["Tequila","Highball","Built"],ingredients:["50 ml tequila blanco","40 ml suco de abacaxi","20 ml suco de pepino","folhas de coentro a gosto","água com gás para completar"],steps:["Macere levemente o coentro no copo.","Adicione gelo, tequila, suco de abacaxi e pepino.","Complete com água com gás e mexa suave."],notes:"Tropical, herbáceo e surpreendente. O coentro transforma o copo.",rating:0,servings:"1",custom:false},
  {name:"Sol e Sal",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila blanco","60 ml suco de grapefruit (toranja)","15 ml xarope de mel","sal na borda","gelo"],steps:["Prepare a borda com sal.","Adicione gelo no copo alto.","Despeje a tequila, o suco de grapefruit e o xarope de mel.","Mexa levemente."],notes:"Uma Paloma com alma de mel. O sal na borda equilibra o amargo da toranja.",rating:0,servings:"1",custom:false},
  {name:"Sombra na Areia",categories:["Mezcal","Sour","Shaken"],ingredients:["45 ml mezcal","30 ml suco de abacaxi","20 ml suco de limão","sal defumado na borda"],steps:["Prepare a borda com sal defumado.","Bata mezcal, abacaxi e limão com gelo.","Coe em coupe ou rocks com borda preparada."],notes:"Cada gole é um pôr do sol no deserto. O defumado do mezcal casa perfeitamente com o tropical.",rating:0,servings:"1",custom:false},
  {name:"Cacto Poético",categories:["Tequila","Sour","Shaken"],ingredients:["50 ml tequila blanco","30 ml suco de grapefruit","20 ml xarope de mel","1 raminho de alecrim","gelo"],steps:["Macere o alecrim levemente na coqueteleira.","Adicione os demais ingredientes com gelo.","Bata e coe duplo em coupe.","Decore com ramo de alecrim."],notes:"Cítrico com final herbal. Como se Neruda tivesse um bar mexicano.",rating:0,servings:"1",custom:false},
  {name:"Bruma de Agave",categories:["Mezcal","Triple Sec","Sour","Shaken"],ingredients:["45 ml mezcal","20 ml Cointreau","20 ml suco de limão","10 ml xarope de agave","sal defumado na borda (opcional)"],steps:["Prepare a borda com sal defumado, se quiser.","Bata tudo com gelo.","Coe em coupe ou taça de Margarita."],notes:"Uma Margarita com alma defumada. O agave dança entre o doce e o intenso.",rating:0,servings:"1",custom:false},
  {name:"Fumaça de Frutas",categories:["Mezcal","Sour","Shaken"],ingredients:["45 ml mezcal","30 ml purê de maracujá","15 ml xarope de mel","1 rodela de pimenta dedo-de-moça","gelo"],steps:["Macere a pimenta levemente na coqueteleira.","Adicione mezcal, maracujá e mel com gelo.","Bata bem e coe duplo em coupe."],notes:"Um carnaval de fumaça e tropicalidade. A pimenta aparece no final — do tipo que faz você pedir outro.",rating:0,servings:"1",custom:false},

  // ── VODKA ──
  {name:"Vesper",categories:["Gim","Vodka","Lillet","Stirred"],ingredients:["45 ml gim","15 ml vodka","15 ml Lillet Blanc","twist de limão"],steps:["Mexa todos os ingredientes com gelo.","Coe em coupe gelado.","Finalize com twist de limão."],notes:"Seco, forte, sofisticado. Aqui o Lillet entra como um perfume.",rating:0,servings:"1",custom:false},
  {name:"Bloody Mary",categories:["Vodka","Highball","Built"],ingredients:["60 ml vodka","120 ml suco de tomate","15 ml suco de limão","2 dash molho inglês","2 dash Tabasco","sal de aipo","pimenta-do-reino"],steps:["Combine tudo em copo alto com gelo.","Role o copo (não mexa) para misturar.","Decore a gosto."],notes:"",rating:0,servings:"",custom:false},
  {name:"Harvey Wallbanger",categories:["Vodka","Licor","Highball","Built"],ingredients:["45 ml vodka","100 ml suco de laranja","15 ml Galliano","gelo"],steps:["Combine vodka e suco em copo alto com gelo.","Float o Galliano por cima."],notes:"",rating:0,servings:"",custom:false},
  {name:"Sex on the Beach",categories:["Vodka","Highball","Built"],ingredients:["40 ml vodka","20 ml schnapps de pêssego","40 ml suco de laranja","40 ml suco de cranberry"],steps:["Combine tudo em copo alto com gelo.","Mexa e decore com laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Lemon Drop",categories:["Vodka","Triple Sec","Sour","Shaken"],ingredients:["60 ml vodka cítrica","30 ml suco de limão","20 ml Cointreau","15 ml xarope simples","açúcar na borda"],steps:["Bata tudo com gelo.","Coe em coupe com borda açucarada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mule de Framboesa",categories:["Vodka","Buck","Highball","Built"],ingredients:["50 ml vodka","20 ml xarope de framboesa","15 ml suco de limão","120 ml cerveja de gengibre","framboesas frescas"],steps:["Combine vodka, xarope e limão em Moscow Mule mug com gelo.","Complete com ginger beer.","Decore com framboesas."],notes:"",rating:0,servings:"",custom:false},

  // ── RUM ──
  {name:"El Presidente",categories:["Rum","Triple Sec","Stirred"],ingredients:["60 ml rum dourado","30 ml vermute branco","15 ml Cointreau","1 dash grenadine","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Expresse a casca de laranja."],notes:"Clássico cubano dos anos 1920.",rating:0,servings:"",custom:false},
  {name:"Planter's Punch",categories:["Rum","Highball","Built"],ingredients:["60 ml rum escuro","30 ml suco de limão","20 ml grenadine","soda para completar","dash de Angostura"],steps:["Combine rum, limão e grenadine em copo alto com gelo.","Complete com soda.","Dash de Angostura por cima."],notes:"",rating:0,servings:"",custom:false},
  {name:"Rum Old Fashioned",categories:["Rum Envelhecido","Stirred"],ingredients:["60 ml rum envelhecido","5 ml xarope de açúcar mascavo","2 dash Angostura","casca de laranja"],steps:["Dissolva o xarope com os bitters.","Adicione rum e gelo. Mexa bem.","Expresse a casca de laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Painkiller",categories:["Rum","Shaken"],ingredients:["60 ml rum escuro","120 ml suco de abacaxi","30 ml creme de coco","30 ml suco de laranja","noz-moscada"],steps:["Bata tudo com gelo.","Sirva em copo alto.","Rale noz-moscada por cima."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mary Pickford",categories:["Rum","Luxardo Maraschino","Shaken"],ingredients:["60 ml rum branco","60 ml suco de abacaxi","15 ml Maraschino","1 dash grenadine"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Clássico da Era Proibição, Cuba.",rating:0,servings:"",custom:false},

  // ── GIN ──
  {name:"Tom Collins",categories:["Gim","Collins","Built"],ingredients:["60 ml gim","30 ml suco de limão","15 ml xarope simples","soda para completar","rodela de limão e cereja"],steps:["Combine gim, limão e xarope em copo Collins com gelo.","Complete com soda.","Decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Corpse Reviver #2",categories:["Gim","Lillet","Triple Sec","Absinto","Sour","Shaken"],ingredients:["22 ml gim","22 ml Cointreau","22 ml Lillet Blanc","22 ml suco de limão","1 dash absinthe"],steps:["Enxague a taça com absinthe e descarte.","Bata o restante com gelo.","Coe na taça."],notes:"Para ressuscitar na manhã seguinte.",rating:0,servings:"",custom:false},
  {name:"White Lady",categories:["Gim","Triple Sec","Sour","Shaken"],ingredients:["45 ml gim","25 ml Cointreau","20 ml suco de limão","1 clara de ovo (opcional)"],steps:["Dry shake se usar clara.","Adicione gelo e agite.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Hanky Panky",categories:["Gim","Fernet-Branca","Stirred"],ingredients:["45 ml gim","45 ml vermute doce","7 ml Fernet-Branca","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Expresse a casca de laranja."],notes:"Criado por Ada Coleman, Savoy Hotel, 1925.",rating:0,servings:"",custom:false},
  {name:"Southside",categories:["Gim","Sour","Shaken"],ingredients:["60 ml gim","25 ml suco de limão","20 ml xarope simples","6 folhas de hortelã"],steps:["Macere levemente a hortelã.","Bata tudo com gelo.","Coe duplo em coupe."],notes:"Gim Mojito elegante.",rating:0,servings:"",custom:false},
  {name:"20th Century",categories:["Gim","Lillet","Sour","Shaken"],ingredients:["45 ml gim","20 ml Lillet Blanc","20 ml creme de cacau branco","20 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Equilibra floral, cítrico e chocolate branco.",rating:0,servings:"",custom:false},

  // ── WHISKEY ──
  {name:"Black Manhattan",categories:["Whisky","Stirred"],ingredients:["60 ml whisky de centeio","30 ml Averna Amaro","1 dash Angostura","1 dash Orange Bitters","cereja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Decore com cereja."],notes:"Averna no lugar do vermute.",rating:0,servings:"",custom:false},
  {name:"Toronto",categories:["Whisky","Fernet-Branca","Stirred"],ingredients:["60 ml whisky de centeio","15 ml Fernet-Branca","5 ml xarope simples","1 dash Angostura","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Expresse a casca."],notes:"",rating:0,servings:"",custom:false},
  {name:"Blood and Sand",categories:["Whisky","Shaken"],ingredients:["22 ml Scotch whisky","22 ml Cherry Heering","22 ml vermute doce","22 ml suco de laranja"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"O único cocktail clássico com whisky batido.",rating:0,servings:"",custom:false},
  {name:"Horse's Neck",categories:["Whisky","Highball","Built"],ingredients:["60 ml bourbon","150 ml ginger ale","2 dash Angostura","casca de limão longa"],steps:["Enrole a casca de limão dentro do copo.","Adicione gelo e bourbon.","Complete com ginger ale e bitters."],notes:"",rating:0,servings:"",custom:false},

  // ── ST-GERMAIN ──
  {name:"Elder Fashion",categories:["Whisky","St‑Germain","Stirred"],ingredients:["50 ml bourbon","20 ml St-Germain","1 dash Angostura","casca de limão"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo.","Expresse a casca de limão."],notes:"Old Fashioned floral.",rating:0,servings:"",custom:false},
  {name:"French Gimlet",categories:["Gim","St‑Germain","Sour","Shaken"],ingredients:["50 ml gim","20 ml St-Germain","20 ml suco de limão siciliano"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Floral e refrescante.",rating:0,servings:"",custom:false},
  {name:"St-Germain Sour",categories:["St‑Germain","Sour","Shaken"],ingredients:["45 ml St-Germain","30 ml suco de limão siciliano","15 ml xarope simples","1 clara de ovo"],steps:["Dry shake.","Adicione gelo e agite.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"The Harvest",categories:["Espumante","St‑Germain","Spritz","Built"],ingredients:["30 ml St-Germain","60 ml cidra brut","60 ml espumante","casca de maçã"],steps:["Combine em taça de vinho com gelo.","Decore com casca de maçã."],notes:"Outonal, floral e leve.",rating:0,servings:"",custom:false},

  // ── LUXARDO ──
  {name:"Tuxedo",categories:["Gim","Luxardo Maraschino","Absinto","Stirred"],ingredients:["45 ml gim","45 ml vermute seco","7 ml Maraschino","1 dash absinthe","casca de limão"],steps:["Mexa tudo com gelo.","Coe em coupe."],notes:"Dry Martini com camadas.",rating:0,servings:"",custom:false},
  {name:"Rose",categories:["Vodka","Luxardo Maraschino","Lillet","Shaken"],ingredients:["45 ml vodka","20 ml Lillet Blanc","10 ml Maraschino","casca de limão"],steps:["Mexa com gelo.","Coe em coupe."],notes:"Delicado e floral.",rating:0,servings:"",custom:false},

  // ── LICOR STREGA ──
  {name:"Strega Sour",categories:["Licor Strega","Sour","Shaken"],ingredients:["50 ml Strega","25 ml suco de limão","15 ml xarope simples","1 clara de ovo"],steps:["Dry shake.","Adicione gelo e agite.","Coe em coupe."],notes:"Herbal, floral e complexo.",rating:0,servings:"",custom:false},
  {name:"Strega Spritz",categories:["Espumante","Licor Strega","Spritz","Built"],ingredients:["40 ml Strega","80 ml prosecco","30 ml água com gás","casca de limão"],steps:["Combine em taça com gelo.","Decore com limão."],notes:"",rating:0,servings:"",custom:false},
  {name:"Italian Buck",categories:["Licor Strega","Buck","Highball","Built"],ingredients:["45 ml Strega","15 ml suco de limão","120 ml cerveja de gengibre","rodela de limão"],steps:["Combine em copo alto com gelo.","Mexa e decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Witch's Kiss",categories:["Licor Strega","Gim","Sour","Shaken"],ingredients:["30 ml gim","30 ml Strega","20 ml suco de limão","10 ml mel"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},

  // ── JEREZ / SHERRY ──
  {name:"Bamboo",categories:["Jerez","Vermute seco","Stirred"],ingredients:["45 ml Fino Sherry","45 ml vermute seco","2 dash Orange Bitters","1 dash Angostura","casca de limão"],steps:["Mexa tudo com gelo.","Coe em coupe."],notes:"Baixo teor alcoólico, complexo.",rating:0,servings:"",custom:false},
  {name:"Adonis",categories:["Jerez","Vermute seco","Stirred"],ingredients:["60 ml Fino Sherry","30 ml vermute doce","1 dash Orange Bitters","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Expresse a casca de laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Sherry Cobbler",categories:["Jerez","Built"],ingredients:["90 ml Amontillado Sherry","15 ml xarope de laranja","15 ml suco de limão","gelo britado","frutas da estação"],steps:["Combine sherry, xarope e limão.","Sirva em copo com gelo britado.","Decore com frutas."],notes:"Um dos coquetéis mais antigos.",rating:0,servings:"",custom:false},
  {name:"Rebujito",categories:["Jerez","Highball","Built"],ingredients:["60 ml Fino Sherry","180 ml limonada ou 7UP","hortelã fresca","gelo"],steps:["Combine em copo alto com gelo.","Adicione hortelã."],notes:"Bebida festiva da Andaluzia.",rating:0,servings:"",custom:false},
  {name:"Tío Pepe & Tônica",categories:["Jerez","Highball","Built"],ingredients:["60 ml Fino Sherry (Tío Pepe)","120 ml água tônica","casca de limão","azeitona verde"],steps:["Encha taça balão com gelo.","Adicione o sherry.","Complete com tônica. Decore."],notes:"Muito popular em Sevilha e Londres.",rating:0,servings:"",custom:false},

  // ── FERNET ──
  {name:"Fernet & Coke",categories:["Fernet-Branca","Highball","Built"],ingredients:["50 ml Fernet-Branca","150 ml Coca-Cola","gelo","rodela de limão"],steps:["Encha copo com gelo.","Adicione Fernet e Coca-Cola.","Mexa levemente."],notes:"El clásico argentino.",rating:0,servings:"",custom:false},
  {name:"Industry Sour",categories:["Fernet-Branca","Gim","Sour","Shaken"],ingredients:["30 ml Fernet-Branca","30 ml gim","30 ml suco de limão","20 ml xarope simples"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Favorito de bartenders.",rating:0,servings:"",custom:false},

  // ── PORTO TINTO ──
  {name:"Porto Tônico Tinto",categories:["Porto Tinto","Highball","Built"],ingredients:["60 ml Porto Tinto","120 ml água tônica","casca de laranja","gelo"],steps:["Encha taça balão com gelo.","Adicione o Porto.","Complete com tônica e decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Porto Flip",categories:["Porto Tinto","Shaken"],ingredients:["60 ml Porto Tinto","10 ml conhaque","1 ovo inteiro","noz-moscada"],steps:["Bata tudo com gelo vigorosamente.","Coe em coupe.","Finalize com noz-moscada."],notes:"Clássico vitoriano.",rating:0,servings:"",custom:false},
  {name:"Porto Negroni",categories:["Porto Tinto","Campari","Stirred"],ingredients:["30 ml Porto Tinto","30 ml Campari","30 ml gim","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo.","Expresse a casca de laranja."],notes:"",rating:0,servings:"",custom:false},

  // ── PORTO BRANCO ──
  {name:"Porto Branco & Tônica",categories:["Porto Branco","Highball","Built"],ingredients:["60 ml Porto Branco","120 ml água tônica","rodela de limão","hortelã","gelo"],steps:["Encha taça balão com gelo.","Adicione Porto Branco.","Complete com tônica e decore."],notes:"O clássico de Douro no verão.",rating:0,servings:"",custom:false},
  {name:"Porto Branco Sour",categories:["Porto Branco","Sour","Shaken"],ingredients:["60 ml Porto Branco","25 ml suco de limão","15 ml xarope simples","1 clara de ovo"],steps:["Dry shake.","Adicione gelo e agite.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Porto Branco Spritz",categories:["Espumante","Porto Branco","Spritz","Built"],ingredients:["40 ml Porto Branco","60 ml prosecco","30 ml água com gás","casca de limão"],steps:["Combine em taça com gelo.","Decore com limão."],notes:"",rating:0,servings:"",custom:false},

  // ── LILLET ──
  {name:"Lillet Vive",categories:["Lillet","Highball","Built"],ingredients:["50 ml Lillet Blanc","100 ml água tônica","rodelas de pepino","morango ou hortelã"],steps:["Copo com gelo.","Adicione o Lillet.","Complete com tônica.","Mexa levemente e decore com pepino e hortelã."],notes:"Refrescância absurda. Parece uma brisa com sotaque francês.",rating:0,servings:"1",custom:false},
  {name:"Lillet Berry",categories:["Lillet","Smash","Built"],ingredients:["50 ml Lillet Blanc","frutas vermelhas","80 ml água com gás ou tônica","hortelã"],steps:["Macere levemente as frutas.","Adicione gelo.","Adicione o Lillet e complete com água com gás.","Decore com hortelã."],notes:"Fica com cara de sobremesa líquida, mas ainda adulto.",rating:0,servings:"1",custom:false},
  {name:"Lillet & Gim Highball",categories:["Gim","Lillet","Highball","Built"],ingredients:["30 ml gim","50 ml Lillet Blanc","água com gás","limão"],steps:["Highball com gelo.","Adicione gim e Lillet.","Complete com água com gás.","Finalize com zest de limão."],notes:"Meio caminho entre um gim tônica e algo mais aromático.",rating:0,servings:"1",custom:false},
  {name:"Lillet Honey Lemon",categories:["Lillet","Highball","Built"],ingredients:["50 ml Lillet Blanc","10 ml mel","20 ml suco de limão","água com gás"],steps:["Dissolva o mel no limão.","Adicione gelo.","Adicione o Lillet.","Complete com água com gás."],notes:"Um azedinho elegante, quase medicinal... no bom sentido.",rating:0,servings:"1",custom:false},
  {name:"White Negroni Tropical",categories:["Gim","Lillet","Cynar","Luxardo Maraschino","Stirred"],ingredients:["30 ml gim","30 ml Lillet Blanc","20 ml Cynar","5 ml Luxardo"],steps:["Mexa todos os ingredientes com gelo.","Coe em rocks com gelo.","Decore com casca de laranja."],notes:"Perfil: amargo elegante + leve dulçor + herbal profundo. O Cynar puxa pro vegetal, o Luxardo dá aquele eco doce no fundo.",rating:0,servings:"1",custom:false},
  {name:"Lillet Garden Spritz",categories:["Lillet","St‑Germain","Spritz","Built"],ingredients:["40 ml Lillet Blanc","20 ml St-Germain","água com gás","hortelã ou limão"],steps:["Copo com gelo.","Adicione Lillet e St-Germain.","Complete com água com gás.","Decore com hortelã ou limão."],notes:"Perfil: floral, leve, perigoso de fácil. Isso aqui some no copo. Cuidado.",rating:0,servings:"1",custom:false},
  {name:"Cynar Sunset Highball",categories:["Lillet","Cynar","Highball","Built"],ingredients:["40 ml Lillet Blanc","20 ml Cynar","água com gás","casca de laranja"],steps:["Highball com gelo.","Adicione Lillet e Cynar.","Complete com água com gás.","Expresse a casca de laranja."],notes:"Perfil: refrescante com final amargo adulto. Parece leve... até você perceber que ele tem personalidade.",rating:0,servings:"1",custom:false},
  {name:"French Aviation (hack)",categories:["Gim","Lillet","Luxardo Maraschino","Sour","Shaken"],ingredients:["45 ml gim","20 ml Lillet Blanc","10 ml Luxardo","15 ml limão"],steps:["Agite tudo com gelo.","Coe em coupe gelada."],notes:"Perfil: cítrico, levemente doce, super equilibrado. Sem violeta, mas com mais profundidade. Funciona muito.",rating:0,servings:"1",custom:false},
  {name:"Golden Orchard",categories:["Lillet","Sour","Shaken"],ingredients:["50 ml Lillet Blanc","10 ml mel","15 ml limão","1 dash Angostura"],steps:["Dissolva o mel com o limão.","Agite com gelo.","Coe em coupe.","Pingue o Angostura."],notes:"Perfil: cítrico + mel + especiaria leve. Tem cara de drink de hotel caro que você tenta recriar depois.",rating:0,servings:"1",custom:false},
  {name:"Almost Martini",categories:["Gim","Lillet","Vermute Branco","Stirred"],ingredients:["50 ml gim","25 ml Lillet Blanc","10 ml Vermute branco"],steps:["Mexa todos os ingredientes com gelo.","Coe em taça gelada."],notes:"Perfil: entre Martini e algo mais aromático. Mais acessível que um Martini clássico, menos agressivo.",rating:0,servings:"1",custom:false},
  {name:"Horta & Laranja Queimada",categories:["Lillet","Cynar","Sour","Shaken"],ingredients:["50 ml Lillet Blanc","20 ml Cynar","10 ml suco de limão siciliano","5 ml mel","1 ramo de alecrim","casca de laranja"],steps:["Dissolva o mel no limão.","Adicione Lillet, Cynar e gelo.","Mexa bem (ou bata leve).","Coe para um copo baixo com gelo.","Finalize com casca de laranja queimada e alecrim batido na mão."],notes:"Herbáceo, cítrico e levemente amargo. A laranja queimada é o toque que transforma.",rating:0,servings:"1",custom:false},
  {name:"Lillet Gold Rush",categories:["Gim","Lillet","Sour","Shaken"],ingredients:["40 ml Lillet Blanc","20 ml gim","15 ml suco de limão siciliano","10 ml mel","1 dash de Angostura (opcional)"],steps:["Dissolva o mel no limão.","Adicione gim, Lillet e gelo.","Bata bem.","Coe para um copo baixo ou taça.","Finalize com casca de limão."],notes:"Começa doce e cítrico, abre floral com o Lillet e fecha levemente seco com o gim. Familiar, mas fora do eixo.",rating:0,servings:"1",custom:false},
  {name:"White Orchard Martini",categories:["Gim","Lillet","St‑Germain","Stirred"],ingredients:["50 ml gim","25 ml Lillet Blanc","10 ml St-Germain","twist de limão ou maçã (opcional)"],steps:["Mexa todos os ingredientes com gelo.","Coe em taça gelada.","Finalize com zest."],notes:"Floral elegante, levemente frutado — quase maçã verde. Muito mais interessante que um Martini clássico.",rating:0,servings:"1",custom:false},
  {name:"Solar Highball",categories:["Lillet","Highball","Built"],ingredients:["50 ml Lillet Blanc","20 ml suco de laranja","5 ml limão siciliano","água com gás","casca de laranja"],steps:["Copo alto com gelo.","Adicione todos os ingredientes.","Mexa leve.","Decore com casca de laranja."],notes:"Lembra suco de laranja... até você perceber que não é. Mais adulto, mais seco, mais interessante.",rating:0,servings:"1",custom:false},
  {name:"Lillet Spritz",categories:["Lillet","Espumante","Spritz","Built"],ingredients:["60 ml Lillet Blanc","90 ml prosecco","30 ml água com gás","rodela de laranja"],steps:["Combine em taça de vinho com gelo.","Decore com laranja."],notes:"Leve, floral e refrescante.",rating:0,servings:"",custom:false},
  {name:"French Pearl",categories:["Gim","Lillet","Absinto","Sour","Shaken"],ingredients:["45 ml gim","20 ml Lillet Blanc","20 ml suco de limão","6 folhas de hortelã","1 dash absinthe"],steps:["Macere levemente a hortelã.","Adicione os demais ingredientes com gelo.","Bata e coe duplo em coupe."],notes:"Floral, cítrico e com frescor mentolado.",rating:0,servings:"",custom:false},
  {name:"Lillet & Tônica",categories:["Lillet","Highball","Built"],ingredients:["60 ml Lillet Blanc","120 ml água tônica","rodela de laranja","gelo"],steps:["Encha taça balão com gelo.","Adicione o Lillet.","Complete com tônica e decore."],notes:"O mais simples e elegante dos aperitivos.",rating:0,servings:"",custom:false},
  {name:"Jasmine",categories:["Gim","Campari","Lillet","Triple Sec","Sour","Shaken"],ingredients:["30 ml gim","15 ml Campari","15 ml Cointreau","15 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Equilibrado — amargo, doce e cítrico ao mesmo tempo.",rating:0,servings:"",custom:false},
  {name:"Lillet Rosé Spritz",categories:["Lillet","Espumante","Spritz","Built"],ingredients:["50 ml Lillet Rosé","80 ml prosecco","30 ml água com gás","1 morango","gelo"],steps:["Combine em taça de vinho com gelo.","Decore com morango."],notes:"Mais frutado e delicado que o Lillet Blanc.",rating:0,servings:"",custom:false},

  // ── APERITIVO / AMARO ──
  {name:"Pedro",categories:["Conhaque","Fernet-Branca","Vermute Branco","Stirred"],ingredients:["30 ml conhaque","15 ml fernet","30 ml martini branco","1 rodela de limão siciliano","gelo"],steps:["Encha um copo baixo com gelo.","Adicione o conhaque.","Entre com o martini branco.","Complete com o fernet.","Mexa suavemente — 2 a 3 voltas, sem agitar.","Esprema a rodela de limão e coloque no copo."],notes:"O conhaque traz corpo, o martini abre com floral e baunilha, o fernet aparece como personagem misterioso. O limão evita a guerra civil no paladar.",rating:0,servings:"1",custom:false},
  {name:"Cynar Tônica",categories:["Cynar","Highball","Built"],ingredients:["50 ml Cynar","120 ml água tônica","rodela de laranja","gelo"],steps:["Encha taça balão com gelo.","Adicione Cynar.","Complete com tônica e decore."],notes:"Amargo e refrescante.",rating:0,servings:"",custom:false},
  {name:"Black Negroni",categories:["Gim","Fernet-Branca","Stirred"],ingredients:["30 ml gim","30 ml Fernet-Branca","30 ml vermute doce","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo."],notes:"Intenso e herbal.",rating:0,servings:"",custom:false},
  {name:"Fernet Sour",categories:["Fernet-Branca","Sour","Shaken"],ingredients:["45 ml Fernet-Branca","25 ml suco de limão","20 ml mel","1 clara de ovo"],steps:["Dry shake.","Adicione gelo e agite.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},

  // ── VINHO / FORTIFICADO ──
  {name:"Sangria",categories:["Vinho","Triple Sec","Built"],ingredients:["750 ml vinho tinto","100 ml brandy","50 ml Cointreau","200 ml suco de laranja","frutas cortadas","xarope a gosto"],steps:["Misture tudo e refrigere por 4h.","Sirva em copo com gelo e frutas."],notes:"",rating:0,servings:"6",custom:false},

  // ── SEM ÁLCOOL ──
  {name:"Virgin Mojito",categories:["Não alcóolicos","Smash","Built"],ingredients:["8 folhas de hortelã","30 ml suco de limão","20 ml xarope simples","150 ml água com gás","gelo"],steps:["Macere a hortelã com limão e xarope.","Adicione gelo e complete com água com gás."],notes:"",rating:0,servings:"",custom:false},
  {name:"Shirley Temple",categories:["Não alcóolicos","Highball","Built"],ingredients:["150 ml ginger ale","50 ml suco de laranja","20 ml grenadine","cereja e laranja para decorar"],steps:["Combine em copo alto com gelo.","Adicione grenadine por cima.","Decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Arnold Palmer",categories:["Não alcóolicos","Highball","Built"],ingredients:["150 ml chá preto gelado","150 ml limonada","gelo","rodela de limão"],steps:["Combine em copo alto com gelo.","Mexa suavemente."],notes:"Metade chá, metade limonada.",rating:0,servings:"",custom:false},
  {name:"Hibiscus Fizz",categories:["Não alcóolicos","Fizz","Built"],ingredients:["60 ml chá de hibisco concentrado","15 ml suco de limão","10 ml xarope simples","150 ml água com gás","gelo"],steps:["Combine chá, limão e xarope em copo com gelo.","Complete com água com gás."],notes:"",rating:0,servings:"",custom:false},
  {name:"Cucumber Cooler",categories:["Não alcóolicos","Highball","Built"],ingredients:["60 ml suco de pepino","20 ml suco de limão","15 ml xarope de hortelã","150 ml água tônica","gelo"],steps:["Combine pepino, limão e xarope em copo com gelo.","Complete com tônica."],notes:"",rating:0,servings:"",custom:false},
  {name:"Água de Coco Spritz",categories:["Não alcóolicos","Spritz","Built"],ingredients:["120 ml água de coco","60 ml suco de abacaxi","15 ml suco de limão","60 ml água com gás","gelo"],steps:["Combine tudo em copo alto com gelo.","Mexa delicadamente."],notes:"",rating:0,servings:"",custom:false},
  {name:"Virgin Margarita",categories:["Não alcóolicos","Sour","Shaken"],ingredients:["60 ml suco de limão","30 ml xarope de agave","30 ml suco de laranja","sal na borda"],steps:["Bata tudo com gelo.","Coe em copo com borda salgada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Ginger Lemonade",categories:["Não alcóolicos","Highball","Built"],ingredients:["20 ml xarope de gengibre","30 ml suco de limão","150 ml água com gás","rodela de limão","gelo"],steps:["Combine xarope e limão em copo com gelo.","Complete com água com gás."],notes:"",rating:0,servings:"",custom:false},
  {name:"Shrub de Frutas Vermelhas",categories:["Não alcóolicos","Highball","Built"],ingredients:["40 ml shrub de frutas vermelhas (vinagre + fruta + açúcar)","150 ml água com gás","gelo","frutas para decorar"],steps:["Combine shrub e água com gás em copo com gás com gelo.","Decore com frutas."],notes:"Shrub: macere 1:1:1 fruta, açúcar, vinagre de maçã por 24h.",rating:0,servings:"",custom:false},
  {name:"Granada Ginger Margarita",categories:["Tequila","Triple Sec","Sour","Shaken"],ingredients:["60 ml tequila","15 ml suco de romã","30 ml suco de limão","15 ml Cointreau","15 ml ginger beer"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 12s e coe em copo de margarita ou rocks com gelo."],notes:"Margarita com romã fresca no lugar de grenadine — mais viva e menos doce.",rating:0,servings:"",custom:false},
  {name:"CRF Sour",categories:["CRF","Sour","Shaken"],ingredients:["50 ml CRF","25 ml suco de limão","15 ml xarope simples","1 clara de ovo (opcional)"],steps:["Agite todos os ingredientes sem gelo por 15s (dry shake).","Adicione gelo e agite por mais 15s.","Coe em taça coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"CRF Old Fashioned",categories:["CRF","Stirred"],ingredients:["50 ml CRF","1 col. de chá açúcar (ou xarope simples)","2 dash bitters aromático","casca de laranja"],steps:["Dissolva o açúcar com os bitters e um splash de água.","Adicione o CRF e gelo grande.","Mexa suavemente por 30s.","Expresse a casca de laranja sobre o drink e decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"CRF com St‑Germain",categories:["CRF","St‑Germain","Fizz"],ingredients:["40 ml CRF","20 ml St‑Germain","20 ml suco de limão siciliano","60 ml água com gás"],steps:["Combine CRF, St-Germain e limão na coqueteleira com gelo.","Agite e coe em copo com gelo.","Complete com água com gás e mexa suavemente."],notes:"",rating:0,servings:"",custom:false},

  // ── PREPAROS CASEIROS — XAROPES BASE ──
  {name:"Xarope Simples",categories:["Preparos Caseiros"],ingredients:["200g açúcar refinado","200 ml água filtrada"],steps:["Leve água e açúcar ao fogo médio.","Mexa até dissolver — não deixe ferver.","Retire, deixe esfriar e transfira para frasco."],notes:"Proporção 1:1. A base de quase todo drink. Dura 2 semanas na geladeira. Adicione 1 colher de vodka para conservar por mais tempo.",rating:0,servings:"400 ml",custom:false},
  {name:"Xarope Rico",categories:["Preparos Caseiros"],ingredients:["400g açúcar refinado","200 ml água filtrada"],steps:["Aqueça a água em fogo baixo.","Adicione o açúcar aos poucos, mexendo até dissolver completamente.","Não deixe ferver — retire do fogo assim que homogeneizar.","Deixe esfriar e armazene."],notes:"Proporção 2:1. Mais viscoso e encorpado — dilui menos o drink. Preferido em stirred cocktails (Old Fashioned, Manhattan). Dura até 1 mês na geladeira.",rating:0,servings:"500 ml",custom:false},
  {name:"Xarope Demerara",categories:["Preparos Caseiros"],ingredients:["200g açúcar demerara","200 ml água"],steps:["Leve ao fogo médio e mexa até dissolver.","Não ferva — retire assim que homogeneizar.","Deixe esfriar e armazene."],notes:"Notas de melaço e caramelo que o açúcar refinado não tem. Casa especialmente bem com rum, cachaça envelhecida e bourbon.",rating:0,servings:"400 ml",custom:false},
  {name:"Xarope de Agave",categories:["Preparos Caseiros"],ingredients:["150 ml néctar de agave","75 ml água morna"],steps:["Misture o néctar de agave com a água morna.","Agite bem até homogeneizar.","Armazene em frasco."],notes:"Proporção 2:1 (agave:água). O agave puro é muito viscoso para dosar com precisão — diluído funciona melhor. Base da Tommy's Margarita.",rating:0,servings:"225 ml",custom:false},

  // ── PREPAROS CASEIROS — XAROPES AROMATIZADOS ──
  {name:"Xarope de Mel",categories:["Preparos Caseiros"],ingredients:["150g mel de boa qualidade","100 ml água quente"],steps:["Misture mel e água quente diretamente no frasco.","Agite bem até homogeneizar.","Deixe esfriar antes de usar."],notes:"Não precisa de fogo. Proporção 3:2 (mel:água). Base do Bee's Knees, Gold Rush e Penicillin. Dura 3 semanas na geladeira.",rating:0,servings:"250 ml",custom:false},
  {name:"Xarope de Gengibre",categories:["Preparos Caseiros"],ingredients:["150g gengibre fresco","200g açúcar","200 ml água"],steps:["Rale ou fatie o gengibre sem descascar.","Leve ao fogo com água e açúcar — mexa até dissolver.","Infuse por 30 min fora do fogo.","Coe e transfira para frasco."],notes:"Quanto mais tempo em infusão, mais picante. Para o xarope de mel e gengibre do Penicillin: misture partes iguais deste xarope com xarope de mel.",rating:0,servings:"350 ml",custom:false},
  {name:"Xarope de Canela",categories:["Preparos Caseiros"],ingredients:["3 paus de canela","200g açúcar","200 ml água"],steps:["Leve tudo ao fogo médio até dissolver.","Ferva por 5 minutos para intensificar.","Retire do fogo, tampe e infuse por 1 hora.","Coe e armazene."],notes:"Base do Donn's Mix do Zombie. Ótimo também em drinks de inverno com bourbon e rum envelhecido.",rating:0,servings:"350 ml",custom:false},
  {name:"Xarope de Cardamomo",categories:["Preparos Caseiros"],ingredients:["10 vagens de cardamomo verde","200g açúcar","200 ml água"],steps:["Abra as vagens pressionando com a faca — não precisa triturar.","Leve ao fogo com água e açúcar até dissolver.","Retire do fogo, tampe e infuse por 30 minutos.","Coe e armazene."],notes:"Aromático e levemente picante. Muito usado em gim sours e drinks nórdicos. Casa bem com vodka e aquavit.",rating:0,servings:"350 ml",custom:false},
  {name:"Xarope de Lavanda",categories:["Preparos Caseiros"],ingredients:["2 col. sopa flores de lavanda secas (culinárias)","200g açúcar","200 ml água"],steps:["Ferva água com açúcar até dissolver.","Retire do fogo, adicione a lavanda.","Tampe e infuse por 20 minutos.","Coe bem e armazene."],notes:"Não infuse demais — fica medicinal. 15–20 min é o ponto certo. Base do Lavender Gim Sour.",rating:0,servings:"350 ml",custom:false},
  {name:"Xarope de Hibisco",categories:["Preparos Caseiros"],ingredients:["15g flores de hibisco secas","200g açúcar","400 ml água"],steps:["Ferva a água e adicione o hibisco.","Infuse por 10 minutos — ficará vermelho intenso.","Coe, leve ao fogo com o açúcar e dissolva sem ferver.","Armazene em frasco."],notes:"Cor vibrante, acidez natural e levemente tanânico. Alternativa ao cranberry em sours. Ótimo com gim, vodka e tequila.",rating:0,servings:"500 ml",custom:false},
  {name:"Xarope de Hortelã",categories:["Preparos Caseiros"],ingredients:["1 maço grande de hortelã fresca","200g açúcar","200 ml água"],steps:["Ferva água e açúcar até dissolver.","Retire do fogo e mergulhe a hortelã.","Infuse por 30 minutos tampado.","Coe sem espremer e armazene."],notes:"Não esprema a hortelã na coagem — amarga. Eleva qualquer Mojito e serve de base para coquetéis gelados de verão.",rating:0,servings:"350 ml",custom:false},

  // ── PREPAROS CASEIROS — CORDIAIS ──
  {name:"Cordial de Limão",categories:["Preparos Caseiros"],ingredients:["Casca de 4 limões sicilianos (só a parte amarela)","200g açúcar","200 ml água","60 ml suco de limão siciliano fresco"],steps:["Faça xarope simples com água e açúcar.","Retire do fogo e adicione as cascas de limão.","Infuse por 2 horas tampado.","Coe e misture com o suco de limão fresco."],notes:"Mais rico que o Rose's industrializado. Essencial para o Gimlet clássico. Dura 2 semanas na geladeira.",rating:0,servings:"350 ml",custom:false},
  {name:"Cordial de Toranja",categories:["Preparos Caseiros"],ingredients:["Zest de 2 grapefruits (aprox 20g)","Suco de 2 grapefruits (aprox 180 ml)","200g açúcar"],steps:["Coloque o zest, o suco e o açúcar no liquidificador.","Bata por 1 minuto até o açúcar dissolver e a casca liberar os óleos.","Coe bem em peneira fina ou pano.","Armazene em frasco na geladeira."],notes:"O zest processado junto libera óleos essenciais que o suco sozinho não tem — é o que diferencia este cordial. Cítrico, amargo e profundo. Casa com gim, tequila e mezcal.",rating:0,servings:"300 ml",custom:false},
  {name:"Cordial de Sabugueiro",categories:["Preparos Caseiros"],ingredients:["10g flores de sabugueiro secas (ou 20 cachos frescos)","400g açúcar","400 ml água","Casca e suco de 2 limões sicilianos","2g ácido cítrico"],steps:["Prepare xarope simples com água e açúcar.","Retire do fogo e adicione as flores e a casca de limão.","Infuse por 24 horas em temperatura ambiente.","Coe, adicione o suco de limão e o ácido cítrico.","Armazene em frasco escuro."],notes:"Alternativa caseira ao St-Germain — mais fresco e menos adocicado. Flores frescas dão resultado superior. Dura 2 semanas na geladeira.",rating:0,servings:"600 ml",custom:false},
  {name:"Cordial de Framboesa",categories:["Preparos Caseiros"],ingredients:["250g framboesas frescas ou congeladas","200g açúcar","150 ml água","15 ml suco de limão"],steps:["Leve framboesas, açúcar e água ao fogo médio.","Amasse levemente com colher enquanto aquece.","Assim que ferver, retire do fogo e coe sem espremer.","Adicione o suco de limão e armazene."],notes:"Mais intenso que grenadine, com acidez real de fruta. Base do Kir, Russian Spring Punch e Mule de Framboesa.",rating:0,servings:"350 ml",custom:false},

  // ── PREPAROS CASEIROS — MODIFICADORES COMPLEXOS ──
  {name:"Grenadine Caseira",categories:["Preparos Caseiros"],ingredients:["250 ml suco de romã puro (ou 4 romãs espremidas)","250g açúcar","10 ml suco de limão","splash de água de flor de laranjeira (opcional)"],steps:["Misture suco de romã e açúcar em fogo baixo.","Mexa até dissolver — não ferva (perde a cor).","Adicione limão e flor de laranjeira.","Deixe esfriar e armazene."],notes:"A grenadine industrial é corante e xarope de milho. A caseira tem cor e profundidade reais. Dura 3 semanas na geladeira.",rating:0,servings:"400 ml",custom:false},
  {name:"Orgeat (Xarope de Amêndoa)",categories:["Preparos Caseiros"],ingredients:["200g amêndoas cruas sem sal","300g açúcar","250 ml água","30 ml água de flor de laranjeira","5 ml extrato de amêndoa (opcional)"],steps:["Cubra as amêndoas com água fervente por 1 min e retire a pele.","Triture as amêndoas com a água no liquidificador por 2 min.","Coe em pano de musselina espremendo bem — este é o leite de amêndoa.","Leve ao fogo com açúcar até dissolver.","Retire, adicione flor de laranjeira e extrato. Deixe esfriar."],notes:"Indispensável no Mai Tai e no Trinidad Sour. Espremer bem o bagaço é onde está o sabor.",rating:0,servings:"500 ml",custom:false},
  {name:"Falernum Caseiro",categories:["Preparos Caseiros"],ingredients:["500 ml cachaça ou rum branco","60g amêndoas fatiadas","Casca de 5 limas","5 cravos-da-índia","1 col. chá extrato de baunilha","1 col. chá extrato de amêndoa","Suco de 2 limas","300g açúcar","200 ml água"],steps:["Infuse a cachaça com amêndoas, casca de lima e cravos por 24h.","Coe a infusão descartando os sólidos.","Prepare xarope simples com açúcar e água.","Misture a infusão com o xarope, suco de lima e extratos.","Armazene em frasco escuro."],notes:"Licor caribenho de cravo, amêndoa e lima. Essencial no Zombie e no Illegal Sour. Versão sem álcool: substitua a cachaça por água e infuse por 48h.",rating:0,servings:"750 ml",custom:false},

  // ── CLÁSSICOS IBA & OUTROS (adicionados dos PDFs) ──
  {name:"Champagne Cocktail",categories:["Conhaque","Espumante","Built"],ingredients:["90 ml champagne ou espumante brut gelado","20 ml conhaque","1 cubo de açúcar","2 dashes Angostura Bitters"],steps:["Embeba o cubo de açúcar com Angostura e coloque no fundo da taça.","Adicione o conhaque.","Complete devagar com o champagne gelado."],notes:"Um dos primeiros coquetéis documentados (1862). O cubo dissolve enquanto você bebe.",rating:0,servings:"1",custom:false},
  {name:"Mint Julep",categories:["Whisky","Smash","Built"],ingredients:["60 ml bourbon","4 ramos de hortelã fresca","10 ml xarope simples","gelo triturado"],steps:["Macere suavemente a hortelã com o xarope no fundo do copo.","Encha com gelo triturado.","Despeje o bourbon por cima.","Mexa suavemente e decore com ramo de hortelã."],notes:"Obrigatório no Kentucky Derby. O copo metálico gelado é parte do ritual.",rating:0,servings:"1",custom:false},
  {name:"Rusty Nail",categories:["Whisky","Licor","Stirred"],ingredients:["45 ml Scotch whisky","25 ml Drambuie","casca de limão"],steps:["Coloque gelo em rocks.","Adicione o Scotch e o Drambuie.","Mexa suavemente.","Expresse a casca de limão e decore."],notes:"Drambuie é um licor de mel e ervas feito com base em Scotch — complementares por natureza.",rating:0,servings:"1",custom:false},
  {name:"French Martini",categories:["Vodka","Shaken"],ingredients:["45 ml vodka","15 ml Chambord ou licor de framboesa","30 ml suco de abacaxi fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente — o abacaxi cria espuma natural.","Coe em taça coupe gelada."],notes:"IBA official. A espuma de abacaxi é a assinatura visual. Agite com força.",rating:0,servings:"1",custom:false},
  {name:"Gibson",categories:["Gim","Vermute seco","Stirred"],ingredients:["75 ml gim","15 ml vermute seco","cebola pérola em conserva (garnish)"],steps:["Mexa gim e vermute com gelo por 30s.","Coe em taça coupe gelada.","Decore com cebola pérola — nunca azeitona."],notes:"É um Dry Martini, mas a cebola em conserva é o que define o Gibson.",rating:0,servings:"1",custom:false},
  {name:"Angel Face",categories:["Gim","Shaken"],ingredients:["30 ml gim","30 ml apricot brandy (licor de damasco)","30 ml calvados ou brandy de maçã"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"IBA official. Partes iguais — o calvados e o damasco elevam o gim de forma inesperada.",rating:0,servings:"1",custom:false},
  {name:"Monkey Gland",categories:["Gim","Sour","Shaken"],ingredients:["45 ml gim","45 ml suco de laranja fresco","1 col. chá absinto","1 col. chá grenadine"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"Criado no Harry's New York Bar, Paris, c. 1920. O absinto e a grenadine aparecem como sombras discretas.",rating:0,servings:"1",custom:false},
  {name:"Brandy Crusta",categories:["Conhaque","Luxardo Maraschino","Sour","Stirred"],ingredients:["52 ml conhaque","7 ml Luxardo Maraschino","7 ml Curaçao de laranja","15 ml suco de limão","5 ml xarope simples","2 dashes Angostura","açúcar na borda"],steps:["Prepare a borda da taça com açúcar.","Mexa todos os ingredientes com gelo.","Coe na taça preparada."],notes:"De Nova Orleans, c. 1850 — ancestral direto do Sidecar e do Cosmopolitan.",rating:0,servings:"1",custom:false},
  {name:"Casino",categories:["Gim","Luxardo Maraschino","Sour","Shaken"],ingredients:["40 ml gim (Old Tom ou London Dry)","10 ml Luxardo Maraschino","10 ml suco de limão","2 dashes Orange Bitters"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em taça coupe."],notes:"IBA classic. Com Old Tom Gim (levemente adocicado) fica mais equilibrado.",rating:0,servings:"1",custom:false},
  {name:"John Collins",categories:["Gim","Collins","Built"],ingredients:["60 ml gim London Dry","30 ml suco de limão fresco","15 ml xarope simples","60 ml soda","rodela de limão e cereja"],steps:["Combine gim, limão e xarope em copo Collins com gelo.","Complete com soda.","Mexa suavemente e decore."],notes:"Usa London Dry Gim — mais seco que o Tom Collins (Old Tom Gim).",rating:0,servings:"1",custom:false},
  {name:"Paradise",categories:["Gim","Sour","Shaken"],ingredients:["30 ml gim","20 ml apricot brandy (licor de damasco)","15 ml suco de laranja fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"IBA classic. Proporção 3:2:1,5. Floral, frutado e direto.",rating:0,servings:"1",custom:false},
  {name:"Old Cuban",categories:["Rum Envelhecido","Espumante","Fizz","Shaken"],ingredients:["45 ml rum envelhecido","22 ml suco de lima","22 ml xarope simples","6 folhas de hortelã","2 dashes Angostura Bitters","60 ml champagne ou prosecco brut"],steps:["Macere levemente a hortelã na coqueteleira.","Agite rum, lima, xarope, hortelã e Angostura com gelo.","Coe em taça. Complete com espumante gelado.","Decore com folha de hortelã."],notes:"Criado por Audrey Saunders, c. 2001. Um Mojito elevado ao território do champagne.",rating:0,servings:"1",custom:false},
  {name:"Yellow Bird",categories:["Rum","Triple Sec","Licor","Sour","Shaken"],ingredients:["30 ml rum branco","15 ml Galliano","15 ml Cointreau","15 ml suco de lima"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"Drink caribenho dos anos 1950. O Galliano herbal é o segredo da personalidade.",rating:0,servings:"1",custom:false},
  {name:"Trinidad Sour",categories:["Whisky","Sour","Shaken"],ingredients:["45 ml Angostura Bitters","30 ml orgeat (xarope de amêndoa)","22 ml suco de limão","15 ml whisky de centeio"],steps:["Mexa tudo com gelo no copo misturador.","Coe em coupe."],notes:"O Angostura como espírito base — não como acento. O orgeat doma o amargor. Surpreende a todos.",rating:0,servings:"1",custom:false},
  {name:"Barracuda",categories:["Rum","Espumante","Licor","Highball","Shaken"],ingredients:["45 ml rum dourado","15 ml Galliano","60 ml suco de abacaxi fresco","10 ml suco de lima","prosecco para completar"],steps:["Agite rum, Galliano, abacaxi e lima com gelo.","Coe em copo alto.","Complete com prosecco gelado."],notes:"IBA official. Galliano + abacaxi + prosecco: tropical e elegante ao mesmo tempo.",rating:0,servings:"1",custom:false},
  {name:"Tipperary",categories:["Whisky","Vermute Tinto","Licor","Stirred"],ingredients:["50 ml Irish whiskey","25 ml vermute tinto doce","15 ml Green Chartreuse","2 dashes Angostura"],steps:["Mexa tudo com gelo no copo misturador.","Coe em taça coupe."],notes:"Um Manhattan com Green Chartreuse no lugar do Maraschino. A erva transforma tudo.",rating:0,servings:"1",custom:false},
  {name:"Suffering Bastard",categories:["Conhaque","Gim","Ginger Beer","Highball","Shaken"],ingredients:["30 ml conhaque","30 ml gim","15 ml suco de lima","2 dashes Angostura","cerveja de gengibre para completar"],steps:["Agite conhaque, gim, lima e Angostura com gelo.","Coe em copo alto.","Complete com ginger beer."],notes:"Criado no Cairo, 1942, como 'remédio' pós-festa. IBA official.",rating:0,servings:"1",custom:false},
  {name:"Illegal Sour",categories:["Mezcal","Rum","Luxardo Maraschino","Sour","Shaken"],ingredients:["30 ml mezcal","15 ml rum branco jamaicano","15 ml falernum","5 ml Luxardo Maraschino","22 ml suco de lima","15 ml xarope simples","30 ml clara de ovo (opcional)"],steps:["Dry shake com clara por 10s.","Adicione gelo e agite mais 15s.","Coe duplo em coupe."],notes:"IBA official. Mezcal defumado + rum + falernum (cravo, amêndoa, gengibre). Complexo e surpreendente.",rating:0,servings:"1",custom:false},
  {name:"Russian Spring Punch",categories:["Vodka","Espumante","Licor","Fizz","Shaken"],ingredients:["25 ml vodka","25 ml suco de limão","15 ml crème de cassis","10 ml xarope simples","espumante brut para completar"],steps:["Agite vodka, limão, cassis e xarope com gelo.","Coe em flute.","Complete com espumante gelado.","Decore com framboesa."],notes:"Criado por Dick Bradsell, anos 1980. Leve, fresco e com cor roxa sedutora.",rating:0,servings:"1",custom:false},
  {name:"El Diablo",categories:["Tequila","Ginger Beer","Highball","Built"],ingredients:["45 ml tequila blanco","20 ml crème de cassis","15 ml suco de lima","cerveja de gengibre para completar"],steps:["Adicione gelo em copo alto.","Coloque tequila, cassis e lima.","Complete com ginger beer. Mexa uma vez.","Decore com rodela de lima."],notes:"O cassis no fundo cria um degradê vermelho tentador. Refrescante e com profundidade.",rating:0,servings:"1",custom:false},
  {name:"Bloody Maria",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","120 ml suco de tomate","15 ml suco de limão","2 dashes molho inglês","2 dashes Tabasco","sal de aipo","pimenta-do-reino"],steps:["Combine tudo em copo alto com gelo.","Role o copo (não mexa) para misturar.","Decore com aipo e limão."],notes:"A Bloody Mary com tequila. A tequila traz terroir que a vodka não tem.",rating:0,servings:"1",custom:false},
  {name:"Salty Dog",categories:["Vodka","Highball","Built"],ingredients:["60 ml vodka","120 ml suco de grapefruit fresco","sal na borda"],steps:["Prepare a borda com sal grosso.","Encha com gelo.","Adicione vodka e suco de grapefruit. Mexa."],notes:"Sem sal na borda vira Greyhound. Com gim, é a versão clássica britânica.",rating:0,servings:"1",custom:false},
  {name:"Bronx Cocktail",categories:["Gim","Vermute Branco","Vermute Tinto","Sour","Shaken"],ingredients:["45 ml gim","22 ml vermute tinto doce","22 ml vermute seco","30 ml suco de laranja fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"Clássico nova-iorquino de 1906. O suco de laranja suaviza o duplo vermute.",rating:0,servings:"1",custom:false},
  {name:"Pimm's Cup",categories:["Collins","Highball","Built"],ingredients:["60 ml Pimm's No. 1","30 ml suco de limão","limonada ou ginger ale para completar","rodelas de pepino","morangos fatiados","hortelã fresca"],steps:["Encha copo alto com gelo.","Adicione Pimm's e suco de limão.","Complete com limonada.","Decore generosamente com pepino, morango e hortelã."],notes:"O drink do verão inglês. Obrigatório em Wimbledon.",rating:0,servings:"1",custom:false},
  {name:"Zombie",categories:["Rum Envelhecido","Rum","Shaken"],ingredients:["45 ml rum jamaicano escuro","45 ml rum dourado","30 ml rum Demerara","22 ml suco de lima","15 ml falernum","15 ml suco de grapefruit","10 ml xarope de canela","5 ml grenadine","1 dash Angostura","6 gotas absinto"],steps:["Combine tudo com 170g de gelo triturado no liquidificador.","Bata rapidamente (pulse, não contínuo).","Despeje em copo alto e decore com hortelã e frutas."],notes:"Criado por Donn Beach, c. 1934. Limite de 2 por pessoa — não é brincadeira.",rating:0,servings:"1",custom:false},
  {name:"Grasshopper",categories:["Licor","Shaken"],ingredients:["20 ml crème de menthe verde","20 ml crème de cacao branco","20 ml creme de leite fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em taça coupe."],notes:"Clássico americano pós-Proibição. Verde, cremoso e mentolado — sobremesa líquida.",rating:0,servings:"1",custom:false},
  {name:"Golden Dream",categories:["Triple Sec","Licor","Shaken"],ingredients:["20 ml Galliano","20 ml Cointreau","20 ml suco de laranja fresco","20 ml creme de leite fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em taça coupe."],notes:"IBA official after-dinner. Partes iguais — Galliano herbal + creme + laranja + Cointreau.",rating:0,servings:"1",custom:false},
  {name:"Cachanchara",categories:["Rum","Built"],ingredients:["60 ml aguardente de cana cubana ou cachaça","15 ml mel cru","15 ml suco de lima","50 ml água"],steps:["Misture mel e água no copo para diluir.","Adicione o suco de lima.","Coloque gelo e o destilado.","Mexa com energia."],notes:"Drink tradicional cubano — considerado precursor do Mojito. Simples e honesto.",rating:0,servings:"1",custom:false},
  {name:"Collins de Toranja com Ervas",categories:["Gim","Collins","Built"],ingredients:["50 ml gim","25 ml Cordial de Toranja","água com gás para completar","ramo de alecrim ou manjericão"],steps:["Encha copo alto com gelo.","Adicione o gim e o cordial de toranja.","Complete com água com gás e mexa suavemente.","Adicione alecrim ou manjericão para perfumar."],notes:"O cordial entra como camada aromática extra. A erva fresca amplifica as notas florais do gim.",rating:0,servings:"1",custom:false},
  {name:"Grapefruit Gimlet",categories:["Gim","Sour","Shaken"],ingredients:["50 ml gim","25 ml Cordial de Toranja"],steps:["Combine gim e cordial na coqueteleira com gelo.","Mexa bem por 20s.","Coe em taça de coquetel gelada."],notes:"Releitura elegante do Gimlet com cordial caseiro. Minimalista e afiado — os óleos da casca dão profundidade que o suco sozinho não tem.",rating:0,servings:"1",custom:false},
  {name:"Spritz de Toranja",categories:["Espumante","Spritz","Built"],ingredients:["40 ml Cordial de Toranja","60 ml espumante brut","40 ml água com gás"],steps:["Encha taça de vinho com gelo.","Adicione o cordial de toranja.","Complete com espumante e água com gás. Mexa suavemente."],notes:"Aperitivo leve com amargor natural da toranja. Bitter sem precisar de bitter.",rating:0,servings:"1",custom:false},
  {name:"Highball de Toranja e Bourbon",categories:["Whisky","Highball","Built"],ingredients:["50 ml bourbon","20 ml Cordial de Toranja","água com gás para completar"],steps:["Encha copo alto com gelo.","Adicione o bourbon e o cordial de toranja.","Complete com água com gás e mexa suavemente."],notes:"Refrescante, levemente amargo e equilibrado. Funciona muito bem com bourbon mais doce, como Buffalo Trace.",rating:0,servings:"1",custom:false},
  {name:"Margarita de Lavanda e Coco",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml licor de laranja","30 ml suco de limão taiti","15 ml xarope de lavanda","15 ml creme de coco","açúcar de lavanda para a borda"],steps:["Prepare a borda com açúcar de lavanda.","Combine tequila, licor de laranja, limão, xarope e creme de coco na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Floral, cremoso e levemente tropical. A lavanda perfuma sem dominar — o coco suaviza a acidez.",rating:0,servings:"1",custom:false},
  {name:"Margarita Melancia e Hibisco",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml licor de laranja","30 ml suco de limão taiti","15 ml xarope de hibisco","pedaços de melancia para macerar","açúcar e hibisco seco para a borda"],steps:["Prepare a borda com açúcar e hibisco seco.","Macere os pedaços de melancia no fundo da coqueteleira.","Adicione tequila, licor de laranja, limão e xarope de hibisco com gelo.","Agite por 15s e coe em rocks com gelo."],notes:"Cor intensa e sabor de verão. O hibisco reforça o vermelho da melancia e traz leve acidez floral.",rating:0,servings:"1",custom:false},
  {name:"Margarita Laranja Sanguínea e Aperol",categories:["Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml Aperol","30 ml suco de laranja sanguínea","30 ml suco de limão taiti","30 ml xarope simples"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"O Aperol substitui o licor de laranja — traz amargor e cor sem doçura extra. A laranja sanguínea aprofunda o perfil cítrico.",rating:0,servings:"1",custom:false},
  {name:"Margarita Aperol e Coco",categories:["Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml Aperol","30 ml suco de limão taiti","15 ml creme de coco"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Mínimo de ingredientes, resultado surpreendente. Amargo do Aperol + cremoso do coco — contraste que funciona.",rating:0,servings:"1",custom:false},
  {name:"Margarita Laranja Sanguínea e Coco",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml licor de laranja","30 ml suco de limão taiti","30 ml suco de laranja sanguínea","15 ml creme de coco"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Cor rosada natural, sabor equilibrado. A laranja sanguínea traz complexidade e o coco suaviza a acidez.",rating:0,servings:"1",custom:false},
  {name:"Margarita de Kiwi Vermelho",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml licor de laranja","30 ml suco de limão taiti","½ kiwi vermelho amassado","15 ml xarope de agave"],steps:["Macere o kiwi vermelho no fundo da coqueteleira.","Adicione tequila, licor de laranja, limão e agave com gelo.","Agite por 15s e coe duplo em rocks com gelo."],notes:"Kiwi vermelho (tropical) tem sabor mais suave e floral que o verde. Cor rosada natural sem corante.",rating:0,servings:"1",custom:false},
  {name:"Key Lime Pie Margarita",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml licor de laranja","30 ml suco de limão taiti","15 ml xarope de baunilha","2 barspoons iogurte de limão","biscoito graham cracker triturado para a borda"],steps:["Prepare a borda com biscoito triturado.","Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Releitura da torta em drinque. O iogurte traz cremosidade e acidez láctica — a baunilha amarra o conjunto.",rating:0,servings:"1",custom:false},
  {name:"Margarita Ancho Chili e Toranja",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["45 ml tequila","15 ml licor de laranja","30 ml suco de limão taiti","30 ml suco de grapefruit","15 ml xarope de pimenta ancho","borda de ancho chili, sal e raspas de limão"],steps:["Prepare a borda com ancho chili, sal e raspas de limão.","Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Xarope de ancho chili: ferva 1 xícara de água + 1 xícara de açúcar + 2 col. sopa de pimenta ancho moída. Coe e esfrie. Defumado, cítrico e com calor progressivo.",rating:0,servings:"1",custom:false},
  {name:"Margarita Picante de Pepino",categories:["Tequila","Sour","Shaken"],ingredients:["45 ml tequila","15 ml Ancho Reyes","15 ml xarope de agave","30 ml suco de limão taiti","22 ml suco de pepino","borda de tajin"],steps:["Prepare a borda com tajin.","Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Ancho Reyes no lugar do licor de laranja — pimenta e notas defumadas. O pepino refresca e equilibra o calor.",rating:0,servings:"1",custom:false},
  {name:"Margarita Orange Creamsicle",categories:["Triple Sec","Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml licor de laranja","30 ml suco de laranja fresco","15 ml suco de limão taiti","22 ml creme de coco","açúcar com raspas de laranja e limão para a borda"],steps:["Prepare a borda com açúcar e raspas cítricas.","Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Inspirado no picolé de laranja com creme. O creme de coco traz suavidade sem ser pesado.",rating:0,servings:"1",custom:false},
  {name:"Alaska",categories:["Gim","Licor","Stirred"],ingredients:["45 ml gim","15 ml Chartreuse amarela","1 dash bitters"],steps:["Mexa gim e Chartreuse com gelo em copo misturador por 30s.","Coe em taça de coquetel gelada.","Decore com casca de limão."],notes:"Minimalista, herbal e muito elegante. O Chartreuse amplifica o gim sem dominar.",rating:0,servings:"1",custom:false},
  {name:"Bijou",categories:["Gim","Vermute Tinto","Licor","Stirred"],ingredients:["30 ml gim","30 ml vermute tinto","30 ml Chartreuse verde"],steps:["Mexa tudo com gelo em copo misturador por 30s.","Coe em taça de coquetel.","Decore com cereja marrasquino."],notes:"Herbal intenso, quase um jardim engarrafado. Proporções iguais — sem dominante, todos brigam lindamente.",rating:0,servings:"1",custom:false},
  {name:"Brown Derby",categories:["Whisky","Sour","Shaken"],ingredients:["50 ml bourbon","25 ml suco de toranja","10-15 ml mel (ou xarope de mel 1:1)"],steps:["Combine bourbon, suco de toranja e mel na coqueteleira com gelo.","Agite bem por 12s.","Coe em coupe.","Decore com casca de toranja."],notes:"Bourbon + toranja + mel: simples no papel, elegante no copo. Clássico Hollywood dos anos 1930. Se usar mel puro, dissolva com um pouco de suco antes de bater.",rating:0,servings:"1",custom:false},
  {name:"Champs-Élysées",categories:["Conhaque","Licor","Sour","Shaken"],ingredients:["45 ml conhaque","15 ml Chartreuse amarela","15 ml suco de limão siciliano","10 ml xarope simples (ou mel)","1 dash Angostura"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem.","Coe em taça coupe.","Decore com casca de limão."],notes:"Ácido + doce + herbal em equilíbrio preciso. Um Sour vestido de alfaiataria francesa. Mel no lugar do xarope traz mais complexidade.",rating:0,servings:"1",custom:false},
  {name:"Cynar Spritz",categories:["Cynar","Spritz","Built"],ingredients:["60 ml Cynar","90 ml espumante brut (ou prosecco)","água com gás a gosto","gelo","1 rodela de laranja"],steps:["Encha um copo largo com gelo.","Adicione o Cynar, depois o espumante.","Complete com água com gás.","Mexa suavemente e decore com rodela de laranja."],notes:"Aperol Spritz com mais personalidade e amargura herbal. Vai embora mais rápido do que deveria.",rating:0,servings:"1",custom:false},
  {name:"Pegu Club",categories:["Gim","Triple Sec","Sour","Shaken"],ingredients:["50 ml gim","20 ml curaçao de laranja","15 ml suco de limão","1 dash Angostura","1 dash orange bitters"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em coupe.","Decore com casca de limão."],notes:"Criado no Pegu Club de Rangoon (atual Yangon), c. 1920. Um Sour mais sofisticado e seco.",rating:0,servings:"1",custom:false},
  {name:"Remember the Maine",categories:["Whisky","Luxardo Maraschino","Vermute Tinto","Stirred"],ingredients:["50 ml whisky de centeio ou bourbon","20 ml vermute tinto","1 bar spoon Luxardo Maraschino","rinse de absinto"],steps:["Enxague a taça de coquetel com absinto e descarte o excesso.","Mexa o whisky, vermute e Maraschino com gelo em copo misturador por 30s.","Coe na taça preparada.","Decore com cereja."],notes:"Um Manhattan mais profundo e levemente misterioso. O absinto é sutil mas transforma o drink.",rating:0,servings:"1",custom:false},
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getTheme(cats=[]) {
  for (const s of STYLE_PRIORITY) if (cats.includes(s)) return TYPE_THEME[s];
  return TYPE_THEME["_default"];
}
function Stars({n,color}){
  if(!n)return null;
  return <span style={{fontSize:11,color:color||"#C8A96E",letterSpacing:1}}>{"★".repeat(n)}<span style={{opacity:.15}}>{"★".repeat(5-n)}</span></span>;
}

// ─── FORM ─────────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name:"", ingredients:[""], steps:[""], notes:"", rating:0, servings:"", categories:[] };
const labelSt = { display:"block", fontSize:9, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(240,235,225,0.52)", fontWeight:700, marginBottom:7 };
const addBtnSt = { marginTop:4, padding:"5px 12px", borderRadius:3, background:"none", border:"1px solid rgba(240,235,225,0.1)", color:"rgba(240,235,225,0.58)", cursor:"pointer", fontSize:11, letterSpacing:.5, fontFamily:"Archivo,sans-serif" };

function RecipeForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [suggesting, setSuggesting] = useState(false);
  const [suggErr, setSuggErr] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const photoRef = useRef();

  useEffect(() => { return () => { if (previewImg) URL.revokeObjectURL(previewImg); }; }, [previewImg]);

  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const setListItem = (k,i,v) => setForm(f=>({...f,[k]:f[k].map((x,j)=>j===i?v:x)}));
  const addListItem = k => setForm(f=>({...f,[k]:[...f[k],""]}));
  const removeListItem = (k,i) => setForm(f=>({...f,[k]:f[k].filter((_,j)=>j!==i)}));
  const toggleCat = c => setField("categories", form.categories.includes(c) ? form.categories.filter(x=>x!==c) : [...form.categories, c]);

  const scanPhoto = useCallback(async (file) => {
    if (!file) return;
    // Rate limit: 10 leituras de imagem por dia por usuário
    const uid = auth.currentUser?.uid || "anon";
    const today = new Date().toISOString().slice(0, 10);
    const rlKey = `otr_scan_${uid}_${today}`;
    const used = parseInt(localStorage.getItem(rlKey) || "0", 10);
    if (used >= 10) {
      setScanErr("Você já usou as 10 leituras de imagem disponíveis por hoje. Volte amanhã — sua barra vai continuar aqui! 🍹");
      return;
    }
    localStorage.setItem(rlKey, String(used + 1));
    setScanning(true); setScanErr(null);
    const preview = URL.createObjectURL(file);
    setPreviewImg(preview);
    try {
      const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const response = await fetch("/api/anthropic", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1200, system:`Você é um bartender expert. Extraia a receita de drink da imagem e retorne APENAS um JSON com:\n- "name": nome em português\n- "ingredients": array de strings em português, com medidas em ml (1 fl oz = 30 ml, 1/2 oz = 15 ml, 3/4 oz = 22 ml, 1/4 oz = 7 ml, 2 oz = 60 ml)\n- "steps": array de strings em português, descrevendo o preparo\n- "notes": string em português com observações relevantes\n- "servings": string (ex: "1", "2 pessoas")\n- "styles": array com estilos do drink entre: ${STYLE_PRIORITY.filter(s=>s!=="Preparos Caseiros").join(", ")}\n- "spirits": array com spirits principais entre: ${[...SPIRIT_CATS].join(", ")}\nSem texto fora do JSON.`, messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data:base64}},{type:"text",text:"Extraia a receita desta imagem e retorne o JSON."}]}] }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) throw new Error("Limite de uso atingido. Tente novamente mais tarde.");
        throw new Error("Serviço indisponível no momento. Tente novamente em breve.");
      }
      const parsed = JSON.parse((data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
      const newCats=[...new Set([...(parsed.styles||[]),...(parsed.spirits||[])])];
      setForm(f => ({ ...f, name:parsed.name||f.name, ingredients:parsed.ingredients?.length?parsed.ingredients:f.ingredients, steps:parsed.steps?.length?parsed.steps:f.steps, notes:parsed.notes||f.notes, servings:parsed.servings||f.servings, categories:newCats.length?newCats:f.categories }));
    } catch (e) { setScanErr(e?.message || "Não foi possível ler a receita. Tente novamente."); }
    setScanning(false);
  }, []);

  const suggestCategories = useCallback(async () => {
    if (!form.ingredients.filter(Boolean).length && !form.name) return;
    setSuggesting(true); setSuggErr(null);
    try {
      const res = await fetch("/api/anthropic", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:400, system:`Você é um bartender especialista. Analise o drink e retorne APENAS um JSON com "styles" e "spirits".\nEstilos: ${STYLE_PRIORITY.join(", ")}\nSpirits: ${[...SPIRIT_CATS].join(", ")}\nExemplo: {"styles":["Sour","Shaken"],"spirits":["Gim"]}`, messages:[{role:"user",content:`Nome: ${form.name}\nIngredientes:\n${form.ingredients.filter(Boolean).join("\n")}`}] }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error("Limite de uso atingido.");
        throw new Error("Serviço indisponível.");
      }
      const parsed = JSON.parse((data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
      setField("categories", [...new Set([...form.categories,...(parsed.styles||[]),...(parsed.spirits||[])])]);
    } catch (e) { setSuggErr(e?.message || "Erro ao sugerir."); }
    setSuggesting(false);
  }, [form.name, form.ingredients]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, ingredients:form.ingredients.filter(Boolean), steps:form.steps.filter(Boolean), custom:initial?.custom??true, id:initial?.id||Date.now() });
  };

  const inp = (extra={}) => ({ style:{ width:"100%", background:"rgba(240,235,225,0.04)", border:"1px solid rgba(240,235,225,0.09)", borderRadius:3, padding:"8px 11px", color:"#F0EBE1", fontSize:13, outline:"none", fontFamily:"Archivo,sans-serif", ...extra.style }, ...extra });
  const theme = getTheme(form.categories);

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20,backdropFilter:"blur(12px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0A0A0A",border:"1px solid rgba(240,235,225,0.08)",borderRadius:6,width:"100%",maxWidth:620,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{padding:"24px 28px 30px"}}>
          <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])scanPhoto(e.target.files[0]);e.target.value="";}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:"#F0EBE1"}}>{initial?"Editar receita":"Nova receita"}</h2>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>photoRef.current?.click()} disabled={scanning} style={{padding:"6px 14px",borderRadius:3,background:"rgba(240,235,225,0.05)",border:"1px solid rgba(240,235,225,0.1)",color:scanning?"#C8A96E":"rgba(240,235,225,0.45)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>
                {scanning?"⏳ lendo…":"📷 importar foto"}
              </button>
              <button onClick={onClose} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:"50%",width:30,height:30,color:"rgba(240,235,225,0.4)",fontSize:16,cursor:"pointer"}}>×</button>
            </div>
          </div>

          {previewImg&&(
            <div style={{marginBottom:16,borderRadius:5,overflow:"hidden",border:"1px solid rgba(240,235,225,0.07)",position:"relative"}}>
              <img src={previewImg} alt="receita" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block",opacity:scanning?.5:1}}/>
              {scanning&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}><div style={{fontSize:28}}>🔍</div><div style={{fontSize:12,color:"#C8A96E",letterSpacing:1.5,textTransform:"uppercase"}}>Analisando…</div></div>}
              {!scanning&&<button onClick={()=>setPreviewImg(null)} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.65)",border:"none",borderRadius:"50%",width:24,height:24,color:"rgba(240,235,225,0.7)",fontSize:13,cursor:"pointer"}}>×</button>}
            </div>
          )}
          {scanErr&&<div style={{marginBottom:14,padding:"9px 13px",borderRadius:3,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#F87171",fontSize:12}}>{scanErr}</div>}

          <label style={labelSt}>Nome do drink</label>
          <input {...inp()} value={form.name} onChange={e=>setField("name",e.target.value)} placeholder="ex: Gim Sour de Lavanda" style={{...inp().style,marginBottom:18,fontSize:15}}/>

          <label style={labelSt}>Ingredientes</label>
          {form.ingredients.map((ing,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
              <input {...inp()} value={ing} onChange={e=>setListItem("ingredients",i,e.target.value)} placeholder={`Ingrediente ${i+1}`}/>
              {form.ingredients.length>1&&<button onClick={()=>removeListItem("ingredients",i)} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:3,color:"rgba(240,235,225,0.52)",width:32,flexShrink:0,cursor:"pointer",fontSize:14}}>×</button>}
            </div>
          ))}
          <button onClick={()=>addListItem("ingredients")} style={addBtnSt}>+ ingrediente</button>

          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:20,marginBottom:10}}>
            <label style={{...labelSt,margin:0}}>Categorias</label>
            <button onClick={suggestCategories} disabled={suggesting} style={{padding:"3px 12px",borderRadius:20,fontSize:10,background:"rgba(160,120,90,0.12)",border:"1px solid rgba(160,120,90,0.4)",color:"#A0785A",cursor:"pointer",letterSpacing:.5,fontFamily:"Archivo,sans-serif"}}>
              {suggesting?"sugerindo…":"✦ sugerir com IA"}
            </button>
            {suggErr&&<span style={{fontSize:11,color:"#F87171"}}>{suggErr}</span>}
          </div>

          <div style={{marginBottom:6}}>
            <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.45)",marginBottom:6}}>Família / Técnica</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {STYLE_PRIORITY.map(s=>{const th=TYPE_THEME[s]||TYPE_THEME["_default"];const on=form.categories.includes(s);return <button key={s} onClick={()=>toggleCat(s)} style={{padding:"3px 10px",borderRadius:20,fontSize:11,background:on?th.accent+"22":"rgba(240,235,225,0.04)",border:`1px solid ${on?th.accent+"66":"rgba(240,235,225,0.08)"}`,color:on?th.label:"rgba(240,235,225,0.32)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s}</button>;})}
            </div>
            <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.45)",marginBottom:6}}>Spirits / Ingredientes principais</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {ALL_SPIRIT_OPTIONS.map(s=>{const on=form.categories.includes(s);return <button key={s} onClick={()=>toggleCat(s)} style={{padding:"3px 10px",borderRadius:20,fontSize:11,background:on?"rgba(160,120,90,0.15)":"rgba(240,235,225,0.04)",border:`1px solid ${on?"rgba(160,120,90,0.5)":"rgba(240,235,225,0.08)"}`,color:on?"#A0785A":"rgba(240,235,225,0.28)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s}</button>;})}
            </div>
          </div>

          <label style={{...labelSt,marginTop:18}}>Modo de preparo</label>
          {form.steps.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"flex-start"}}>
              <div style={{width:24,height:24,borderRadius:3,border:`1px solid ${theme.border}55`,color:theme.label,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:5,fontWeight:700}}>{i+1}</div>
              <textarea {...inp()} value={s} onChange={e=>setListItem("steps",i,e.target.value)} placeholder={`Passo ${i+1}`} rows={2} style={{...inp().style,resize:"none",lineHeight:1.5}}/>
              {form.steps.length>1&&<button onClick={()=>removeListItem("steps",i)} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:3,color:"rgba(240,235,225,0.52)",width:32,height:32,flexShrink:0,cursor:"pointer",fontSize:14,marginTop:2}}>×</button>}
            </div>
          ))}
          <button onClick={()=>addListItem("steps")} style={addBtnSt}>+ passo</button>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:18}}>
            <div>
              <label style={labelSt}>Notas</label>
              <textarea {...inp()} value={form.notes} onChange={e=>setField("notes",e.target.value)} placeholder="observações, dicas…" rows={2} style={{...inp().style,resize:"none",lineHeight:1.5}}/>
            </div>
            <div>
              <label style={labelSt}>Rende</label>
              <input {...inp()} value={form.servings} onChange={e=>setField("servings",e.target.value)} placeholder="ex: 1 dose" style={{...inp().style,marginBottom:10}}/>
              <label style={labelSt}>Rating</label>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setField("rating",form.rating===n?0:n)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:n<=form.rating?"#C8A96E":"rgba(240,235,225,0.12)",transition:"color .1s"}}>★</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:10,marginTop:24,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{padding:"9px 20px",borderRadius:3,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.4)",cursor:"pointer",fontSize:13,fontFamily:"Archivo,sans-serif"}}>Cancelar</button>
            <button onClick={handleSave} disabled={!form.name.trim()} style={{padding:"9px 24px",borderRadius:3,background:"rgba(160,120,90,0.18)",border:"1px solid rgba(160,120,90,0.5)",color:"#A0785A",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Archivo,sans-serif",opacity:form.name.trim()?1:.4}}>
              {initial?"Salvar alterações":"Adicionar receita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NOISE OVERLAY ────────────────────────────────────────────────────────────
function NoiseOverlay({opacity=0.038}){
  const id=useId();
  return(
    <svg aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity,mixBlendMode:"overlay"}}>
      <filter id={id}><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
      <rect width="100%" height="100%" filter={`url(#${id})`}/>
    </svg>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function DrinkCard({recipe,isFav,onFav,isTried,onTried,isComanda,onComanda,hasAll,onClick,onDelete}){
  const theme=getTheme(recipe.categories);
  const styleTag=recipe.categories.find(c=>STYLE_CATS.has(c));
  const spiritTag=recipe.categories.find(c=>SPIRIT_CATS.has(c));
  const [hov,setHov]=useState(false);
  const [quickActions,setQuickActions]=useState(false);
  const longPressTimer=useRef();
  const wasLongPress=useRef(false);
  const startLongPress=()=>{wasLongPress.current=false;longPressTimer.current=setTimeout(()=>{wasLongPress.current=true;setQuickActions(true);},500);};
  const endLongPress=()=>clearTimeout(longPressTimer.current);
  return(
    <div
      onPointerDown={startLongPress} onPointerUp={endLongPress} onPointerLeave={endLongPress} onPointerCancel={endLongPress}
      onClick={()=>{if(wasLongPress.current)return;onClick();}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:theme.bg,borderRadius:4,padding:"16px 16px 14px 18px",cursor:"pointer",position:"relative",overflow:"hidden",transform:hov?"translateY(-2px)":"none",boxShadow:hov?`0 10px 36px rgba(0,0,0,.55), inset 0 0 40px ${theme.accent}08`:`0 2px 10px rgba(0,0,0,.45), inset 0 0 24px ${theme.accent}04`,display:"flex",flexDirection:"column",minHeight:152,borderLeft:`2px solid ${hov?theme.accent+"cc":theme.accent+"44"}`,transition:"all .2s ease"}}>

      {/* noise grain */}
      <NoiseOverlay/>

      {/* watermark copo */}
      <div style={{position:"absolute",right:-18,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",opacity:0.05}}>
        <GlassIcon categories={recipe.categories} color={theme.accent} size={145}/>
      </div>

      {/* linha de topo — gradiente sutil */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${theme.accent}88,${theme.accent}22,transparent)`,opacity:hov?.8:.3,transition:"opacity .2s"}}/>

      {/* fav + comanda */}
      <button onClick={e=>{e.stopPropagation();onFav();}} style={{position:"absolute",top:8,right:8,background:"none",border:"none",cursor:"pointer",padding:4,transition:"all .2s",color:isFav?theme.accent:"rgba(255,255,255,0.15)",filter:isFav?`drop-shadow(0 0 5px ${theme.accent}88)`:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {isFav
          ?<svg width="15" height="12" viewBox="0 0 20 15" fill={theme.accent}><path d="M10 13.5C10 13.5 1 8 1 4C1 1.8 2.8.5 5.5.5 7.5.5 9 1.8 10 3.5 11 1.8 12.5.5 14.5.5 17.2.5 19 1.8 19 4 19 8 10 13.5 10 13.5z"/></svg>
          :<svg width="15" height="12" viewBox="0 0 20 15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"><path d="M10 13.5C10 13.5 1 8 1 4C1 1.8 2.8.5 5.5.5 7.5.5 9 1.8 10 3.5 11 1.8 12.5.5 14.5.5 17.2.5 19 1.8 19 4 19 8 10 13.5 10 13.5z"/></svg>
        }
      </button>
      <button onClick={e=>{e.stopPropagation();onComanda();}} style={{position:"absolute",top:8,right:30,background:"none",border:"none",fontSize:12,color:isComanda?"#C8A96E":"rgba(255,255,255,0.1)",cursor:"pointer",padding:4,transition:"color .2s",filter:isComanda?"drop-shadow(0 0 5px rgba(200,169,110,0.7))":"none"}}>
        {isComanda?"◫":"◻"}
      </button>

      {/* tags */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        {styleTag&&<span style={{fontSize:8,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,color:theme.accent}}>{styleTag}</span>}
        {spiritTag&&<><span style={{fontSize:8,color:theme.accent,opacity:.3}}>·</span><span style={{fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(240,235,225,0.52)"}}>{spiritTag}</span></>}
        {recipe.custom&&<><span style={{fontSize:8,color:"rgba(160,120,90,.3)"}}>·</span><span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:"rgba(160,120,90,0.6)"}}>minha</span></>}
      </div>

      {/* nome */}
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:21,fontWeight:700,lineHeight:1.1,color:"#F0EBE1",marginBottom:9,paddingRight:48,letterSpacing:.2}}>{recipe.name}</div>

      {/* stars */}
      {recipe.rating>0&&<div style={{marginBottom:9}}><Stars n={recipe.rating} color={theme.accent}/></div>}

      {/* divisor */}
      <div style={{height:1,background:`linear-gradient(90deg,${theme.accent}33,transparent)`,marginBottom:9,marginTop:"auto"}}/>

      {/* ingredientes */}
      <div>
        <div style={{fontSize:7,letterSpacing:2.5,textTransform:"uppercase",color:theme.accent,opacity:.5,marginBottom:4}}>Ingredientes</div>
        <div style={{fontSize:10,color:"rgba(240,235,225,0.52)",lineHeight:1.65,whiteSpace:"nowrap",overflow:"hidden",WebkitMaskImage:"linear-gradient(to right,black 60%,transparent 100%)",maskImage:"linear-gradient(to right,black 60%,transparent 100%)"}}>
          {recipe.ingredients.slice(0,3).map((ing,i)=>(
            <span key={i}>{i>0&&<span style={{opacity:.4,margin:"0 4px"}}>·</span>}{ing}</span>
          ))}{recipe.ingredients.length>3&&<span style={{opacity:.3}}> · …</span>}
        </div>
      </div>

      {hasAll&&<div style={{position:"absolute",bottom:8,right:30,fontSize:7,letterSpacing:1.5,textTransform:"uppercase",color:"#4ADE80",opacity:.75}}>tenho tudo</div>}
      <button onClick={e=>{e.stopPropagation();onTried();}} style={{position:"absolute",bottom:6,right:8,background:"none",border:"none",fontSize:14,color:isTried?"#4ADE80":"rgba(255,255,255,0.12)",cursor:"pointer",padding:4,lineHeight:1,transition:"color .15s"}}>
        {isTried?"✓":"○"}
      </button>

      {/* ações rápidas (long press) */}
      {quickActions&&(
        <div onClick={e=>{e.stopPropagation();setQuickActions(false);}}
          style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",borderRadius:4,display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",gap:8,padding:"16px",zIndex:10}}>
          <button onClick={e=>{e.stopPropagation();onTried();setQuickActions(false);}}
            style={{padding:"8px 14px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:.3,cursor:"pointer",fontFamily:"Archivo,sans-serif",
              background:isTried?"rgba(74,222,128,0.12)":"rgba(240,235,225,0.07)",
              border:`1px solid ${isTried?"rgba(74,222,128,0.4)":"rgba(240,235,225,0.18)"}`,
              color:isTried?"#4ADE80":"rgba(240,235,225,0.75)"}}>
            {isTried?"Remover provado":"Já provei"}
          </button>
          <button onClick={e=>{e.stopPropagation();onComanda();setQuickActions(false);}}
            style={{padding:"8px 14px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:.3,cursor:"pointer",fontFamily:"Archivo,sans-serif",
              background:isComanda?"rgba(200,169,110,0.12)":"rgba(240,235,225,0.07)",
              border:`1px solid ${isComanda?"rgba(200,169,110,0.4)":"rgba(240,235,225,0.18)"}`,
              color:isComanda?"#C8A96E":"rgba(240,235,225,0.75)"}}>
            {isComanda?"Remover da comanda":"+ Comanda"}
          </button>
          <button onClick={e=>{e.stopPropagation();onFav();setQuickActions(false);}}
            style={{padding:"8px 14px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:.3,cursor:"pointer",fontFamily:"Archivo,sans-serif",
              background:isFav?`${theme.accent}18`:"rgba(240,235,225,0.07)",
              border:`1px solid ${isFav?theme.accent+"44":"rgba(240,235,225,0.18)"}`,
              color:isFav?theme.accent:"rgba(240,235,225,0.75)"}}>
            {isFav?"Desfavoritar":"Favoritar"}
          </button>
          {onDelete&&(
            <button onClick={e=>{e.stopPropagation();if(window.confirm("Excluir esta receita?"))onDelete();setQuickActions(false);}}
              style={{padding:"8px 14px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:.3,cursor:"pointer",fontFamily:"Archivo,sans-serif",
                background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.35)",color:"#F87171"}}>
              Deletar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({recipe,onClose,isFav,onFav,isTried,onTried,isComanda,onComanda,onRating,onNote,onFilter,onEdit,onDelete}){
  const theme=getTheme(recipe.categories);
  const [steps,setSteps]=useState(recipe.steps);
  const [generating,setGenerating]=useState(false);
  const [genErr,setGenErr]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [hoverStar,setHoverStar]=useState(0);
  const [noteVal,setNoteVal]=useState(recipe.notes||"");
  const [editingNote,setEditingNote]=useState(false);
  const [sharing,setSharing]=useState(false);
  const [checked,setChecked]=useState(new Set());
  const [qty,setQty]=useState(1);
  const scaleIng=useCallback((ing,q)=>{
    if(q===1)return ing;
    return ing.replace(/^([\d]+(?:[.,][\d]+)?(?:\/[\d]+)?)\s*/,(match,num)=>{
      const n=parseFloat(num.replace(",",".").replace(/(\d+)\/(\d+)/,(_,a,b)=>a/b));
      if(isNaN(n))return match;
      const s=Math.round(n*q*10)/10;
      return (s%1===0?s:s)+' ';
    });
  },[]);
  const toggleCheck=i=>setChecked(p=>{const n=new Set(p);n.has(i)?n.delete(i):n.add(i);return n;});
  const noteRef=useRef();
  const shareCardRef=useRef();

  const shareAsImage=useCallback(async()=>{
    if(!shareCardRef.current||sharing)return;
    setSharing(true);
    try{
      const canvas=await html2canvas(shareCardRef.current,{backgroundColor:null,scale:2,logging:false,useCORS:true});
      canvas.toBlob(async blob=>{
        if(!blob){setSharing(false);return;}
        const file=new File([blob],`${recipe.name.toLowerCase().replace(/\s+/g,"-")}.png`,{type:"image/png"});
        if(navigator.canShare&&navigator.canShare({files:[file]})){
          try{await navigator.share({files:[file],title:recipe.name});}
          catch{}
        } else {
          const url=URL.createObjectURL(blob);
          const a=document.createElement("a");
          a.href=url;a.download=file.name;a.click();
          setTimeout(()=>URL.revokeObjectURL(url),1000);
        }
        setSharing(false);
      },"image/png");
    }catch{setSharing(false);}
  },[recipe,sharing]);

  const generateSteps=useCallback(async()=>{
    setGenerating(true);setGenErr(null);
    try{
      const res=await fetch("/api/anthropic",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:800,system:"Você é um bartender experiente. Responda APENAS com array JSON de strings, cada string sendo um passo. Sem texto fora do JSON.",messages:[{role:"user",content:`Drink: "${recipe.name}"\nIngredientes:\n${recipe.ingredients.join("\n")}`}]})});
      const data=await res.json();
      setSteps(JSON.parse((data.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim()));
    }catch{setGenErr("Erro ao gerar. Tente novamente.");}
    setGenerating(false);
  },[recipe]);

  const styleTags=recipe.categories.filter(c=>STYLE_CATS.has(c));
  const spiritTags=recipe.categories.filter(c=>SPIRIT_CATS.has(c));

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20,backdropFilter:"blur(12px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(160deg,${theme.bg} 0%,#080808 50%)`,border:`1px solid ${theme.border}33`,borderRadius:6,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto",boxShadow:`0 0 80px ${theme.accent}08`,position:"relative"}}>

        {/* botão fechar */}
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,width:28,height:28,borderRadius:3,border:`1px solid ${theme.border}33`,background:"rgba(0,0,0,0.5)",color:"rgba(240,235,225,0.4)",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>×</button>

        <div style={{padding:"28px 28px 32px"}}>

          {/* ── CABEÇALHO: 2 colunas ── */}
          <div style={{display:"flex",alignItems:"stretch",gap:0,marginBottom:24}}>

            {/* coluna esquerda */}
            <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",justifyContent:"space-between",position:"relative"}}>
              {/* ambient glow detrás do nome */}
              <div style={{position:"absolute",top:-10,left:-28,width:240,height:130,background:theme.accent,opacity:0.09,borderRadius:"50%",filter:"blur(48px)",pointerEvents:"none"}}/>

              {/* linha acento */}
              <div style={{height:1,background:`linear-gradient(90deg,${theme.accent},${theme.accent}00)`,marginBottom:16,width:"60%",position:"relative"}}/>

              {/* tags */}
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
                {styleTags.map(c=><button key={c} onClick={()=>onFilter("style",c)} style={{padding:"2px 10px",borderRadius:2,fontSize:10,letterSpacing:1,background:(TYPE_THEME[c]?.accent||"#888")+"16",border:`1px solid ${(TYPE_THEME[c]?.border||"#888")+"44"}`,color:TYPE_THEME[c]?.label||"rgba(240,235,225,0.5)",fontWeight:700,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{c}</button>)}
                {spiritTags.map(c=><button key={c} onClick={()=>onFilter("spirit",c)} style={{padding:"2px 10px",borderRadius:2,fontSize:10,letterSpacing:.5,background:"rgba(160,120,90,0.08)",border:"1px solid rgba(160,120,90,0.22)",color:"rgba(160,120,90,0.85)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{c}</button>)}
                {recipe.custom&&<span style={{padding:"2px 10px",borderRadius:2,fontSize:10,background:"rgba(160,120,90,0.07)",border:"1px solid rgba(160,120,90,0.2)",color:"rgba(160,120,90,0.6)"}}>✦ sua receita</span>}
              </div>

              {/* nome */}
              <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,lineHeight:1.05,color:"#F0EBE1",margin:"0 0 14px",letterSpacing:.3}}>{recipe.name}</h2>

              {/* estrelas */}
              <div style={{display:"flex",gap:2,marginBottom:isTried&&recipe.rating===0?4:14,alignItems:"center"}}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onMouseEnter={()=>setHoverStar(n)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>onRating(n===recipe.rating?0:n)} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:n<=(hoverStar||recipe.rating)?theme.accent:"rgba(240,235,225,0.1)",transition:"color .1s",padding:"2px 3px"}}>★</button>
                ))}
              </div>
              {isTried&&recipe.rating===0&&<div style={{fontSize:10,color:theme.accent,opacity:.55,letterSpacing:1,marginBottom:14}}>como você avaliaria?</div>}

              {/* ações */}
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <button onClick={onTried} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,background:isTried?"rgba(74,222,128,0.08)":"rgba(240,235,225,0.04)",border:`1px solid ${isTried?"rgba(74,222,128,0.35)":"rgba(240,235,225,0.09)"}`,color:isTried?"#4ADE80":"rgba(240,235,225,0.32)",fontSize:11,cursor:"pointer",transition:"all .15s",fontFamily:"Archivo,sans-serif"}}>
                  {isTried?"Já provei":"Marcar provado"}
                </button>
                <button onClick={onFav} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:isFav?theme.accent:"rgba(255,255,255,0.14)",filter:isFav?`drop-shadow(0 0 8px ${theme.accent})`:"none",transition:"all .2s",padding:"4px 6px",display:"flex",alignItems:"center"}}>
                  {isFav
                    ?<svg width="20" height="16" viewBox="0 0 20 15" fill={theme.accent}><path d="M10 13.5C10 13.5 1 8 1 4C1 1.8 2.8.5 5.5.5 7.5.5 9 1.8 10 3.5 11 1.8 12.5.5 14.5.5 17.2.5 19 1.8 19 4 19 8 10 13.5 10 13.5z"/></svg>
                    :<svg width="20" height="16" viewBox="0 0 20 15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"><path d="M10 13.5C10 13.5 1 8 1 4C1 1.8 2.8.5 5.5.5 7.5.5 9 1.8 10 3.5 11 1.8 12.5.5 14.5.5 17.2.5 19 1.8 19 4 19 8 10 13.5 10 13.5z"/></svg>
                  }
                </button>
                <button onClick={onComanda} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,background:isComanda?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${isComanda?"rgba(160,120,90,0.5)":"rgba(240,235,225,0.09)"}`,color:isComanda?"#C8A96E":"rgba(240,235,225,0.32)",fontSize:11,cursor:"pointer",transition:"all .15s",fontFamily:"Archivo,sans-serif"}}>
                  {isComanda?"Na comanda":"+ Comanda"}
                </button>
                <button onClick={shareAsImage} disabled={sharing} title="Compartilhar" style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:3,padding:"5px 10px",color:sharing?"rgba(240,235,225,0.2)":"rgba(240,235,225,0.4)",cursor:sharing?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {sharing?"…":<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>}
                </button>
                <button onClick={onEdit} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:3,padding:"5px 10px",color:"rgba(240,235,225,0.4)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>editar</button>
              </div>
            </div>

            {/* coluna direita — copo */}
            <div style={{flexShrink:0,width:130,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              <div style={{filter:`drop-shadow(0 0 20px ${theme.accent}cc) drop-shadow(0 0 50px ${theme.accent}77) drop-shadow(0 0 90px ${theme.accent}44)`}}>
                <GlassIcon categories={recipe.categories} color={theme.accent} size={110} opacity={0.35}/>
              </div>
            </div>
          </div>

          {/* divisor */}
          <div style={{height:1,background:`linear-gradient(90deg,${theme.accent}44,transparent)`,marginBottom:22}}/>

          {recipe.servings&&<div style={{fontSize:12,color:"rgba(240,235,225,0.48)",fontStyle:"italic",marginBottom:18}}>rende {recipe.servings}</div>}

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:theme.accent,opacity:.6}}>Ingredientes</div>
            <div style={{display:"flex",alignItems:"center",gap:0,border:`1px solid ${theme.border}44`,borderRadius:20,overflow:"hidden"}}>
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:28,height:26,background:"none",border:"none",color:qty>1?theme.accent:"rgba(240,235,225,0.2)",fontSize:16,cursor:qty>1?"pointer":"default",lineHeight:1}}>−</button>
              <span style={{fontSize:11,color:theme.accent,fontWeight:700,minWidth:28,textAlign:"center",letterSpacing:.5}}>{qty}×</span>
              <button onClick={()=>setQty(q=>Math.min(10,q+1))} style={{width:28,height:26,background:"none",border:"none",color:theme.accent,fontSize:16,cursor:"pointer",lineHeight:1}}>+</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:26}}>
            {recipe.ingredients.map((ing,i)=>{
              const done=checked.has(i);
              return(
                <div key={i} onClick={()=>toggleCheck(i)} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 10px",borderRadius:4,cursor:"pointer",background:done?"rgba(240,235,225,0.02)":"transparent",transition:"all .15s"}}>
                  <div style={{width:16,height:16,borderRadius:3,border:`1px solid ${done?theme.accent+"66":"rgba(240,235,225,0.15)"}`,background:done?theme.accent+"22":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                    {done&&<span style={{fontSize:10,color:theme.accent,lineHeight:1}}>✓</span>}
                  </div>
                  <span style={{fontSize:14,color:done?"rgba(240,235,225,0.2)":"rgba(240,235,225,0.72)",lineHeight:1.55,textDecoration:done?"line-through":"none",transition:"all .15s"}}>{scaleIng(ing,qty)}</span>
                </div>
              );
            })}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:theme.accent,opacity:.6}}>Modo de preparo</div>
            {steps.length===0&&!generating&&<button onClick={generateSteps} style={{padding:"3px 12px",borderRadius:20,fontSize:10,background:theme.accent+"16",border:`1px solid ${theme.accent}44`,color:theme.accent,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>✦ gerar com IA</button>}
            {generating&&<span style={{fontSize:11,color:theme.accent,opacity:.5,fontStyle:"italic"}}>gerando…</span>}
          </div>
          {genErr&&<p style={{fontSize:12,color:"#F87171",marginBottom:12}}>{genErr}</p>}

          {steps.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:13,marginBottom:26}}>
              {steps.map((s,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"24px 1fr",gap:12,alignItems:"start"}}>
                  <div style={{width:24,height:24,borderRadius:3,border:`1px solid ${theme.border}`,color:theme.label,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                  <div style={{fontSize:14,color:"rgba(240,235,225,0.68)",lineHeight:1.7,paddingTop:2}}>{s}</div>
                </div>
              ))}
            </div>
          ):!generating&&(
            <div style={{padding:"18px 0 26px",textAlign:"center",color:"rgba(240,235,225,0.55)",fontSize:13,fontStyle:"italic"}}>
              Sem modo de preparo.<br/><span style={{fontSize:11}}>Use o botão acima para gerar com IA.</span>
            </div>
          )}

          {/* notas — editáveis em qualquer receita */}
          <div style={{marginTop:8,marginBottom:recipe.custom?20:0}}>
            {editingNote ? (
              <div>
                <textarea ref={noteRef} value={noteVal} onChange={e=>setNoteVal(e.target.value)} autoFocus rows={3}
                  style={{width:"100%",background:"rgba(240,235,225,0.04)",border:`1px solid ${theme.accent}44`,borderRadius:3,padding:"10px 12px",color:"rgba(240,235,225,0.65)",fontSize:13,lineHeight:1.7,fontStyle:"italic",resize:"vertical",boxSizing:"border-box",fontFamily:"Archivo,sans-serif"}}
                  placeholder="Sua nota sobre esta receita…"
                />
                <div style={{display:"flex",gap:8,marginTop:6}}>
                  <button onClick={()=>{onNote(noteVal);setEditingNote(false);}} style={{padding:"5px 14px",borderRadius:3,background:theme.accent+"18",border:`1px solid ${theme.accent}44`,color:theme.accent,fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>salvar</button>
                  <button onClick={()=>{setNoteVal(recipe.notes||"");setEditingNote(false);}} style={{padding:"5px 12px",borderRadius:3,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.52)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>cancelar</button>
                </div>
              </div>
            ) : noteVal ? (
              <div onClick={()=>setEditingNote(true)} style={{background:theme.accent+"07",borderLeft:`2px solid ${theme.accent}44`,padding:"12px 15px",borderRadius:"0 3px 3px 0",cursor:"text"}}>
                <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:theme.accent,opacity:.5,marginBottom:5}}>Nota</div>
                <div style={{fontSize:13,color:"rgba(240,235,225,0.45)",lineHeight:1.7,fontStyle:"italic"}}>{noteVal}</div>
              </div>
            ) : (
              <button onClick={()=>setEditingNote(true)} style={{background:"none",border:"none",padding:0,color:"rgba(240,235,225,0.42)",fontSize:11,letterSpacing:1.5,textTransform:"uppercase",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>+ adicionar nota</button>
            )}
          </div>

          {recipe.custom&&(
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(240,235,225,0.06)"}}>
              {!confirmDelete?(
                <button onClick={()=>setConfirmDelete(true)} style={{background:"none",border:"1px solid rgba(239,68,68,0.2)",borderRadius:3,padding:"6px 14px",color:"rgba(239,68,68,0.5)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>excluir receita</button>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:12,color:"rgba(240,235,225,0.4)"}}>Tem certeza?</span>
                  <button onClick={onDelete} style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:3,padding:"5px 14px",color:"#F87171",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>sim, excluir</button>
                  <button onClick={()=>setConfirmDelete(false)} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:3,padding:"5px 12px",color:"rgba(240,235,225,0.52)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>cancelar</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* card oculto para captura de imagem */}
      <div ref={shareCardRef} style={{position:"fixed",left:-9999,top:-9999,width:400,background:`linear-gradient(145deg,${theme.bg} 0%,#080808 100%)`,border:`1px solid ${theme.border}55`,borderRadius:12,padding:"28px 30px",fontFamily:"Archivo,sans-serif"}}>
        <div style={{fontSize:8,letterSpacing:5,textTransform:"uppercase",color:"rgba(240,235,225,0.52)",marginBottom:16}}>ON THE ROCKS</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
          {recipe.categories.filter(c=>STYLE_CATS.has(c)).map(c=><span key={c} style={{padding:"2px 9px",borderRadius:2,fontSize:9,letterSpacing:1,background:(TYPE_THEME[c]?.accent||"#888")+"18",border:`1px solid ${(TYPE_THEME[c]?.border||"#888")+"55"}`,color:TYPE_THEME[c]?.label||"rgba(240,235,225,0.5)",fontWeight:700}}>{c}</span>)}
        </div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:600,color:"#F0EBE1",marginBottom:20,lineHeight:1.1}}>{recipe.name}</div>
        <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:theme.accent,opacity:.6,marginBottom:10}}>Ingredientes</div>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:20}}>
          {recipe.ingredients.map((ing,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"baseline"}}>
              <div style={{width:3,height:3,borderRadius:"50%",background:theme.accent,opacity:.5,flexShrink:0,marginTop:8}}/>
              <span style={{fontSize:13,color:"rgba(240,235,225,0.65)",lineHeight:1.5}}>{ing}</span>
            </div>
          ))}
        </div>
        {noteVal&&<div style={{borderLeft:`2px solid ${theme.accent}44`,paddingLeft:12,marginTop:4}}>
          <div style={{fontSize:11,color:"rgba(240,235,225,0.58)",fontStyle:"italic",lineHeight:1.6}}>{noteVal}</div>
        </div>}
        <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(240,235,225,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:14,color:n<=recipe.rating?theme.accent:"rgba(240,235,225,0.1)"}}>★</span>)}</div>
          <div style={{fontSize:8,letterSpacing:2,color:"rgba(240,235,225,0.4)",textTransform:"uppercase"}}>on-the-rocks.app</div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function SidebarContent({sidebarTab,setSidebarTab,allRecipes,activeStyle,setActiveStyle,allSpirits,visibleSpirits,owned,toggleOwned,filterMode,setFilterMode,activeSpirits,toggleSpirit,spiritSearch,setSpiritSearch,hasFilters,clearAll,customSpirits,setCustomSpirits,setMobileTab}){
  const [newSpirit,setNewSpirit]=useState("");
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",borderBottom:"1px solid rgba(240,235,225,0.06)",marginBottom:16}}>
        {["família","spirit"].map(t=>(
          <button key={t} onClick={()=>setSidebarTab(t)} style={{flex:1,padding:"8px 0",background:"none",border:"none",fontSize:9,letterSpacing:3,textTransform:"uppercase",fontWeight:700,color:sidebarTab===t?"#A0785A":"rgba(240,235,225,0.2)",borderBottom:sidebarTab===t?"1px solid #A0785A":"1px solid transparent",marginBottom:-1,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{t}</button>
        ))}
      </div>

      {sidebarTab==="família"?(
        <div style={{flex:1,overflowY:"auto"}}>
          {FAMILY_GROUPS.map(group=>{
            const available=group.items.filter(s=>allRecipes.some(r=>r.categories.includes(s)));
            if(!available.length)return null;
            return(
              <div key={group.label} style={{marginBottom:18}}>
                <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700,marginBottom:6,paddingLeft:2}}>{group.label}</div>
                {available.map(s=>{
                  const th=TYPE_THEME[s]||TYPE_THEME["_default"];
                  const count=allRecipes.filter(r=>r.categories.includes(s)).length;
                  const active=activeStyle===s;
                  return(
                    <button key={s} onClick={()=>{setActiveStyle(active?null:s);if(!active)setMobileTab("explorar");}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",borderRadius:3,marginBottom:2,textAlign:"left",background:active?th.bg:"transparent",border:`1px solid ${active?th.border+"66":"transparent"}`,cursor:"pointer",transition:"all .12s",fontFamily:"Archivo,sans-serif"}}>
                      <div style={{width:7,height:7,borderRadius:1,background:th.accent,opacity:active?1:.28,flexShrink:0}}/>
                      <span style={{flex:1,fontSize:13,color:active?th.label:"rgba(240,235,225,0.42)",fontWeight:active?600:400}}>{s}</span>
                      <span style={{fontSize:10,color:"rgba(240,235,225,0.55)"}}>{count}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700,marginBottom:6,paddingLeft:2}}>Técnica</div>
            {TECHNIQUES.filter(s=>allRecipes.some(r=>r.categories.includes(s))).map(s=>{
              const th=TYPE_THEME[s]||TYPE_THEME["_default"];
              const count=allRecipes.filter(r=>r.categories.includes(s)).length;
              const active=activeStyle===s;
              return(
                <button key={s} onClick={()=>{setActiveStyle(active?null:s);if(!active)setMobileTab("explorar");}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",borderRadius:3,marginBottom:2,textAlign:"left",background:active?th.bg:"transparent",border:`1px solid ${active?th.border+"66":"transparent"}`,cursor:"pointer",transition:"all .12s",fontFamily:"Archivo,sans-serif"}}>
                  <div style={{width:7,height:7,borderRadius:1,background:th.accent,opacity:active?1:.28,flexShrink:0}}/>
                  <span style={{flex:1,fontSize:13,color:active?th.label:"rgba(240,235,225,0.42)",fontWeight:active?600:400}}>{s}</span>
                  <span style={{fontSize:10,color:"rgba(240,235,225,0.55)"}}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700,marginBottom:7}}>Tenho em casa</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:9,maxHeight:95,overflowY:"auto"}}>
            {allSpirits.map(s=>(
              <button key={s} onClick={()=>toggleOwned(s)} style={{padding:"3px 8px",borderRadius:20,fontSize:10,background:owned.includes(s)?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${owned.includes(s)?"rgba(160,120,90,0.44)":"rgba(240,235,225,0.08)"}`,color:owned.includes(s)?"#A0785A":"rgba(240,235,225,0.26)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s}</button>
            ))}
          </div>
          <div style={{borderTop:"1px solid rgba(240,235,225,0.06)",paddingTop:11,marginBottom:7}}>
            <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700,marginBottom:6}}>Filtrar por spirit</div>
            <input value={spiritSearch} onChange={e=>setSpiritSearch(e.target.value)} placeholder="buscar…" style={{width:"100%",background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:3,padding:"7px 10px",color:"#F0EBE1",fontSize:12,marginBottom:7,outline:"none",fontFamily:"Archivo,sans-serif"}}/>
          </div>
          {activeSpirits.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:7}}>{activeSpirits.map(s=><button key={s} onClick={()=>toggleSpirit(s)} style={{padding:"3px 8px",borderRadius:20,fontSize:10,background:"rgba(160,120,90,0.12)",border:"1px solid rgba(160,120,90,0.4)",color:"#A0785A",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s} ×</button>)}</div>}
          <div style={{flex:1,overflowY:"auto"}}>
            {visibleSpirits.map(s=>{
              const count=allRecipes.filter(r=>r.categories.includes(s)).length;
              const active=activeSpirits.includes(s);
              return(<button key={s} onClick={()=>{toggleSpirit(s);if(!active&&setMobileTab)setMobileTab("explorar");}} style={{display:"flex",justifyContent:"space-between",width:"100%",padding:"7px 10px",borderRadius:3,marginBottom:2,background:active?"rgba(160,120,90,0.07)":"transparent",border:`1px solid ${active?"rgba(160,120,90,0.28)":"transparent"}`,color:active?"#A0785A":"rgba(240,235,225,0.38)",fontSize:12,cursor:"pointer",textAlign:"left",transition:"all .1s",fontFamily:"Archivo,sans-serif"}}><span>{s}</span><span style={{fontSize:10,opacity:.3}}>{count}</span></button>);
            })}
          </div>
          <div style={{borderTop:"1px solid rgba(240,235,225,0.06)",paddingTop:10,marginTop:8,flexShrink:0}}>
            <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700,marginBottom:6}}>Adicionar bebida</div>
            <div style={{display:"flex",gap:5}}>
              <input value={newSpirit} onChange={e=>setNewSpirit(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newSpirit.trim()){setCustomSpirits(p=>[...new Set([...p,newSpirit.trim()])]);setNewSpirit("");}}} placeholder="ex: Fernet…" style={{flex:1,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:3,padding:"6px 9px",color:"#F0EBE1",fontSize:12,outline:"none",fontFamily:"Archivo,sans-serif"}}/>
              <button onClick={()=>{if(newSpirit.trim()){setCustomSpirits(p=>[...new Set([...p,newSpirit.trim()])]);setNewSpirit("");}}} style={{padding:"6px 10px",borderRadius:3,background:"rgba(160,120,90,0.1)",border:"1px solid rgba(160,120,90,0.3)",color:"#A0785A",fontSize:13,cursor:"pointer"}}>+</button>
            </div>
            {customSpirits.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:7}}>{customSpirits.map(s=><button key={s} onClick={()=>setCustomSpirits(p=>p.filter(x=>x!==s))} style={{padding:"2px 7px",borderRadius:20,fontSize:10,background:"rgba(160,120,90,0.08)",border:"1px solid rgba(160,120,90,0.2)",color:"rgba(160,120,90,0.6)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s} ×</button>)}</div>}
          </div>
        </div>
      )}
      {owned.length>0&&(
        <button onClick={()=>{setFilterMode(filterMode==="tenho"?"tudo":"tenho");if(setMobileTab)setMobileTab("explorar");}}
          style={{marginTop:10,padding:"13px 0",flexShrink:0,borderRadius:6,
            background:filterMode==="tenho"?"rgba(160,120,90,0.18)":"rgba(160,120,90,0.07)",
            border:`1px solid ${filterMode==="tenho"?"rgba(160,120,90,0.6)":"rgba(160,120,90,0.25)"}`,
            color:filterMode==="tenho"?"#C8A96E":"rgba(160,120,90,0.7)",
            fontSize:11,letterSpacing:2,textTransform:"uppercase",fontWeight:700,
            cursor:"pointer",fontFamily:"Archivo,sans-serif",
            filter:filterMode==="tenho"?`drop-shadow(0 0 10px rgba(160,120,90,0.3))`:"none",
            transition:"all .15s"}}>
          {filterMode==="tenho"?"✓ ":""}{owned.length} ingrediente{owned.length!==1?"s":""} · ver receitas possíveis
        </button>
      )}
      {hasFilters&&filterMode!=="tenho"&&<button onClick={clearAll} style={{marginTop:8,padding:"7px 0",background:"none",flexShrink:0,border:"1px solid rgba(240,235,225,0.07)",borderRadius:3,color:"rgba(240,235,225,0.38)",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>limpar filtros</button>}
    </div>
  );
}

// ─── SWIPE CARD ───────────────────────────────────────────────────────────────
function SwipeCard({recipe,onComanda,isComanda,onTried,isTried,onNext,onPrev,hasPrev,onOpen}){
  const theme=getTheme(recipe.categories);
  const styleTag=recipe.categories.find(c=>STYLE_CATS.has(c));
  const spiritTag=recipe.categories.find(c=>SPIRIT_CATS.has(c));
  const [drag,setDrag]=useState(0);
  const [dragging,setDragging]=useState(false);
  const [gone,setGone]=useState(null); // "left"=próximo | "right"=voltar
  const [entered,setEntered]=useState(false);
  const startX=useRef(0);
  const cardRef=useRef();

  useEffect(()=>{
    const id=requestAnimationFrame(()=>setEntered(true));
    return()=>cancelAnimationFrame(id);
  },[]);

  const THRESH=38;

  const onPointerDown=e=>{startX.current=e.clientX;setDragging(true);cardRef.current?.setPointerCapture(e.pointerId);};
  const onPointerMove=e=>{if(!dragging)return;setDrag(e.clientX-startX.current);};
  const onPointerUp=()=>{
    if(!dragging)return;
    setDragging(false);
    if(drag<-THRESH){
      setGone("left");
      setTimeout(()=>{onNext();setGone(null);setDrag(0);},300);
    } else if(drag>THRESH&&hasPrev){
      setGone("right");
      setTimeout(()=>{onPrev();setGone(null);setDrag(0);},300);
    } else {
      setDrag(0);
    }
  };

  const activeDrag = gone==="left"?-420 : gone==="right"?420 : drag;
  const rotate = activeDrag/13;
  const scale = dragging ? Math.max(0.97,1-Math.abs(drag)*0.0003) : 1;
  const nextPct = Math.max(0,Math.min(1,-activeDrag/THRESH));
  const prevPct = Math.max(0,Math.min(1,activeDrag/THRESH));

  return(
    <div style={{position:"relative",width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 16px",userSelect:"none"}}>

      {/* wrapper entrada */}
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:360,
        opacity:entered?1:0,
        transform:entered?"translateY(0) scale(1)":"translateY(44px) scale(0.93)",
        transition:"opacity .32s ease, transform .42s cubic-bezier(.34,1.56,.64,1)"}}>

        <div ref={cardRef}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={{width:"100%",background:theme.bg,borderRadius:12,
            border:`1px solid ${theme.border}33`,
            cursor:dragging?"grabbing":"grab",
            transform:`translateX(${activeDrag}px) rotate(${rotate}deg) scale(${scale})`,
            transition:dragging?"none":gone?"transform .3s cubic-bezier(.4,0,.6,1)":"transform .38s cubic-bezier(.34,1.56,.64,1)",
            boxShadow:`0 28px 70px rgba(0,0,0,.75), 0 0 50px ${theme.accent}1a`,
            overflow:"hidden",touchAction:"none"}}>

          {/* overlay esquerda — próximo */}
          <div style={{position:"absolute",inset:0,borderRadius:12,background:"linear-gradient(to right,rgba(240,235,225,0.07),transparent)",opacity:nextPct,pointerEvents:"none",zIndex:10}}/>

          {/* overlay direita — voltar */}
          {hasPrev&&<div style={{position:"absolute",inset:0,borderRadius:12,background:`linear-gradient(to left,${theme.accent}1a,transparent)`,opacity:prevPct,pointerEvents:"none",zIndex:10}}/>}

          {/* área clicável */}
          <div onClick={()=>onOpen(recipe)} style={{cursor:"pointer",position:"relative"}}>
            <div style={{position:"relative",height:230,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 72% 65% at 50% 30%, ${theme.accent}28 0%, ${theme.accent}09 58%, transparent 100%)`}}/>
              <div style={{filter:`drop-shadow(0 0 36px ${theme.accent}bb) drop-shadow(0 0 90px ${theme.accent}55)`,position:"relative",zIndex:1}}>
                <GlassIcon categories={recipe.categories} color={theme.accent} size={175} opacity={0.52}/>
              </div>
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:90,background:`linear-gradient(transparent,${theme.bg})`}}/>
            </div>
            <div style={{padding:"0 24px 26px"}}>
              <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                {[styleTag,spiritTag].filter(Boolean).filter((t,i,a)=>a.indexOf(t)===i).map(t=>(
                  <span key={t} style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:theme.accent,background:`${theme.accent}18`,border:`1px solid ${theme.accent}40`,borderRadius:2,padding:"3px 8px"}}>{t}</span>
                ))}
              </div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:34,fontWeight:700,color:"#F0EBE1",lineHeight:1.05,letterSpacing:.3,marginBottom:8}}>{recipe.name}</div>
              {recipe.rating>0&&<div style={{marginBottom:10}}><Stars n={recipe.rating} color={theme.accent}/></div>}
              <div style={{height:1,background:`linear-gradient(90deg,${theme.accent}55,transparent)`,marginBottom:12}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px 8px"}}>
                {recipe.ingredients.slice(0,5).map((ing,i)=>(
                  <span key={i} style={{fontSize:10,color:i===0?"rgba(240,235,225,0.62)":"rgba(240,235,225,0.36)",letterSpacing:.3}}>
                    {i>0&&<span style={{marginRight:7,color:"rgba(240,235,225,0.16)"}}>·</span>}
                    {(s=>s.charAt(0).toUpperCase()+s.slice(1))(ing.replace(/^\d+[\d/\s]*(ml|cl|oz|dash|colher|parte|partes|pitada|fatia|rodela|folha|folhas|ramo|aros|twist)?\.?\s*/i,""))}
                  </span>
                ))}
                {recipe.ingredients.length>5&&<span style={{fontSize:10,color:"rgba(240,235,225,0.26)"}}>+{recipe.ingredients.length-5}</span>}
              </div>
            </div>
          </div>

          {/* rodapé — tried e comanda centralizados */}
          <div style={{padding:"14px 40px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:40,borderTop:`1px solid ${theme.border}22`}}>
            <button onClick={e=>{e.stopPropagation();onTried();}}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,
                background:"none",border:"none",cursor:"pointer",
                color:isTried?"#4ADE80":"rgba(240,235,225,0.32)",
                transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                background:isTried?"rgba(74,222,128,0.09)":"none",
                border:`1px solid ${isTried?"rgba(74,222,128,0.5)":"rgba(240,235,225,0.14)"}`,
                borderRadius:50,width:52,height:52,fontSize:20,
                filter:isTried?"drop-shadow(0 0 6px rgba(74,222,128,0.4))":"none",
                transition:"all .15s"}}>✓</div>
              <span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,fontFamily:"Archivo,sans-serif"}}>já provei</span>
            </button>
            <button onClick={e=>{e.stopPropagation();onComanda();}}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,
                background:"none",border:"none",cursor:"pointer",
                color:isComanda?"#C8A96E":"rgba(240,235,225,0.32)",
                transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                background:isComanda?"rgba(200,169,110,0.12)":"none",
                border:`1px solid ${isComanda?"rgba(200,169,110,0.5)":"rgba(240,235,225,0.14)"}`,
                borderRadius:50,width:52,height:52,fontSize:22,
                filter:isComanda?"drop-shadow(0 0 8px rgba(200,169,110,0.6))":"none",
                transition:"all .15s"}}>{isComanda?"◫":"◻"}</div>
              <span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,fontFamily:"Archivo,sans-serif"}}>adicionar à comanda</span>
            </button>
          </div>
        </div>
      </div>

      {/* dica swipe */}
      <div style={{marginTop:16,display:"flex",gap:18,alignItems:"center",opacity:Math.max(0,1-Math.abs(drag)/25),transition:"opacity .1s"}}>
        <span style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.2)"}}>← próximo</span>
        <div style={{display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:3,height:3,borderRadius:"50%",background:i===1?`${theme.accent}77`:"rgba(240,235,225,0.1)"}}/>)}</div>
        <span style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:hasPrev?`${theme.accent}55`:"rgba(240,235,225,0.1)"}}>voltar →</span>
      </div>
    </div>
  );
}

// ─── RATING POPUP ─────────────────────────────────────────────────────────────
function RatingPopup({recipe,currentRating,onRate,onClose}){
  const [hovered,setHovered]=useState(0);
  const th=getTheme(recipe.categories);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.68)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 28px"}} onClick={onClose}>
      <div style={{background:"#0F0D0A",border:`1px solid ${th.border}55`,borderRadius:16,padding:"28px 24px 22px",maxWidth:300,width:"100%",textAlign:"center",boxShadow:"0 32px 80px rgba(0,0,0,0.8)"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.35)",fontWeight:700,marginBottom:10}}>como foi?</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"#F0EBE1",marginBottom:22,lineHeight:1.2}}>{recipe.name}</div>
        <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:22}}>
          {[1,2,3,4,5].map(n=>(
            <button key={n}
              onMouseEnter={()=>setHovered(n)} onMouseLeave={()=>setHovered(0)}
              onClick={()=>{onRate(n);onClose();}}
              style={{background:"none",border:"none",fontSize:36,cursor:"pointer",padding:"4px 6px",
                color:n<=(hovered||currentRating)?th.accent:"rgba(240,235,225,0.1)",
                transition:"color .1s",lineHeight:1}}>★</button>
          ))}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:10,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.22)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>fechar</button>
      </div>
    </div>
  );
}

// ─── MOBILE NAV ───────────────────────────────────────────────────────────────
function MobileNav({ tab, setTab, favCount }) {
  const items = [
    { id:"descobrir",    icon:"◈", label:"Descobrir" },
    { id:"explorar",     icon:"⊞", label:"Explorar" },
    { id:"ingredientes", icon:"⊙", label:"Bar" },
    { id:"comanda",      icon:"◫", label:"Comanda" },
    { id:"perfil",       icon:"⊛", label:"Perfil" },
  ];
  return (
    <nav className="mnv" style={{position:"fixed",bottom:0,left:0,right:0,background:"#080808",borderTop:"1px solid rgba(240,235,225,0.07)",zIndex:9999,paddingBottom:"env(safe-area-inset-bottom,8px)"}}>
      {items.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 4px 6px",background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",color:tab===t.id?"#A0785A":"rgba(240,235,225,0.26)",transition:"color .15s",fontFamily:"Archivo,sans-serif"}}>
          <span style={{fontSize:17,lineHeight:1}}>{t.icon}</span>
          <span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>{t.label}</span>
          <div style={{height:2,width:tab===t.id?18:0,borderRadius:1,background:"#A0785A",boxShadow:tab===t.id?"0 0 8px #A0785Acc":"none",transition:"width .25s ease, box-shadow .25s ease",marginTop:2}}/>
        </button>
      ))}
    </nav>
  );
}

// ─── PERFIL (mobile tab) ──────────────────────────────────────────────────────
function ProfileTab({ allRecipes, drinkCount, tried, favs, owned, customRecipes, exportJSON, importRef, user, syncing, onGoTo, onOpenRecipe, onRestore, onAddRecipe }) {
  const topRated = [...allRecipes].filter(r=>r.rating>0&&!r.categories.includes("Preparos Caseiros")).sort((a,b)=>b.rating-a.rating).slice(0,5);
  const btnSt = {padding:"12px 16px",borderRadius:3,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",color:"rgba(240,235,225,0.5)",fontSize:13,textAlign:"left",cursor:"pointer",fontFamily:"Archivo,sans-serif",display:"flex",alignItems:"center",gap:10};
  return (
    <div style={{padding:"20px 20px 100px"}}>

      {/* login / usuario */}
      {user ? (
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28,padding:"16px",borderRadius:6,background:"rgba(240,235,225,0.03)",border:"1px solid rgba(240,235,225,0.07)"}}>
          {user.photoURL && <img src={user.photoURL} alt="" style={{width:48,height:48,borderRadius:"50%",border:"1px solid rgba(160,120,90,0.3)"}}/>}
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#F0EBE1",lineHeight:1.2}}>{user.displayName}</div>
            <div style={{fontSize:11,color:"rgba(240,235,225,0.52)",marginTop:3}}>{user.email}</div>
            {syncing && <div style={{fontSize:10,color:"#A0785A",marginTop:4,letterSpacing:1}}>sincronizando…</div>}
          </div>
          <button onClick={signOutUser} style={{padding:"6px 14px",borderRadius:3,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.52)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>sair</button>
        </div>
      ) : (
        <button onClick={signInWithGoogle} style={{width:"100%",marginBottom:28,padding:"14px 16px",borderRadius:5,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.1)",color:"#F0EBE1",fontSize:14,cursor:"pointer",fontFamily:"Archivo,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/><path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34A853"/><path d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" fill="#FBBC05"/><path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z" fill="#EA4335"/></svg>
          Entrar com Google
        </button>
      )}

      {/* stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:28}}>
        {[
          ["Receitas",drinkCount,"tudo"],
          ["Provados",tried.length,"provados"],
          ["Favoritos",favs.length,"favs"],
          ["Minhas receitas",customRecipes.length,"custom"],
        ].map(([l,v,filter])=>(
          <button key={l} onClick={()=>onGoTo(filter)} style={{background:"rgba(240,235,225,0.03)",border:"1px solid rgba(240,235,225,0.07)",borderRadius:5,padding:"16px 14px",textAlign:"left",cursor:"pointer",transition:"border-color .15s",fontFamily:"Archivo,sans-serif"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(160,120,90,0.3)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(240,235,225,0.07)"}>
            <div style={{fontSize:28,fontFamily:"'Cormorant Garamond',serif",fontWeight:600,color:"#A0785A",lineHeight:1}}>{v}</div>
            <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.52)",marginTop:4,fontWeight:700}}>{l}</div>
          </button>
        ))}
      </div>

      {/* top rated */}
      {topRated.length>0&&(
        <div style={{marginBottom:28}}>
          <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.42)",fontWeight:700,marginBottom:10}}>Melhores avaliados</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {topRated.map(r=>{
              const th=getTheme(r.categories);
              return(
                <button key={r.name} onClick={()=>onOpenRecipe(r)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:4,background:"rgba(240,235,225,0.02)",border:`1px solid ${th.border}22`,cursor:"pointer",textAlign:"left",width:"100%",transition:"border-color .15s",fontFamily:"Archivo,sans-serif"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=th.border+"55"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=th.border+"22"}>
                  <div style={{flex:1,fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:"#F0EBE1"}}>{r.name}</div>
                  <Stars n={r.rating} color={th.accent}/>
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* minhas receitas */}
      <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.42)",fontWeight:700,marginBottom:10}}>Minhas receitas</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
        <button onClick={onAddRecipe} style={{...btnSt,color:"#A0785A",borderColor:"rgba(160,120,90,0.3)",background:"rgba(160,120,90,0.08)"}}><span style={{fontSize:18,lineHeight:1}}>+</span> Nova receita</button>
        {customRecipes.map(r=>{const th=getTheme(r.categories);return(
          <button key={r.name} onClick={()=>onOpenRecipe(r)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:4,background:"rgba(240,235,225,0.02)",border:`1px solid ${th.border}22`,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"Archivo,sans-serif",transition:"border-color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=th.border+"55"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=th.border+"22"}>
            <div style={{width:5,height:5,borderRadius:1,background:th.accent,flexShrink:0,opacity:.6}}/>
            <span style={{flex:1,fontSize:13,color:"rgba(240,235,225,0.7)",fontFamily:"'Cormorant Garamond',serif",fontWeight:600}}>{r.name}</span>
            {r.rating>0&&<Stars n={r.rating} color={th.accent}/>}
          </button>
        );})}
      </div>

      {/* dados */}
      <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.42)",fontWeight:700,marginBottom:10}}>Dados</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={exportJSON} style={btnSt}><span style={{fontSize:16}}>↓</span> Exportar backup</button>
        <button onClick={()=>importRef.current?.click()} style={btnSt}><span style={{fontSize:16}}>↑</span> Importar backup</button>
        <button onClick={onRestore} style={{...btnSt,color:"rgba(239,68,68,0.7)",borderColor:"rgba(239,68,68,0.15)"}}><span style={{fontSize:16}}>↺</span> Restaurar receitas originais</button>
      </div>

      {/* sobre */}
      <div style={{marginTop:28,marginBottom:8}}>
        <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.42)",fontWeight:700,marginBottom:12}}>Sobre</div>
        <div style={{background:"rgba(240,235,225,0.02)",border:"1px solid rgba(240,235,225,0.06)",borderRadius:5,padding:"16px 16px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontFamily:"Archivo,sans-serif",fontSize:13,fontWeight:900,letterSpacing:4,textTransform:"uppercase",color:"#F0EBE1"}}>ON THE ROCKS</span>
            <span style={{fontSize:10,color:"rgba(240,235,225,0.42)",letterSpacing:1}}>v1.0</span>
          </div>
          <p style={{fontSize:11,color:"rgba(240,235,225,0.45)",lineHeight:1.6,margin:0}}>Desenvolvido por Marcelo Parducci</p>
          <div style={{paddingTop:10,borderTop:"1px solid rgba(240,235,225,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
              <span style={{fontSize:10,color:"rgba(240,235,225,0.48)",letterSpacing:.5}}>Dados</span>
              <span style={{fontSize:10,color:"rgba(240,235,225,0.4)",textAlign:"right"}}>Sincronizados via Google Account</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(240,235,225,0.05)",textAlign:"center",fontSize:10,color:"rgba(240,235,225,0.42)",letterSpacing:0.5,lineHeight:1.7}}>
        Conteúdo destinado a maiores de 18 anos.<br/>Beba com responsabilidade.
      </div>

      <div style={{marginTop:16,textAlign:"center",fontSize:9,color:"rgba(240,235,225,0.18)",letterSpacing:1,fontFamily:"Archivo,sans-serif"}}>
        {(()=>{
          const d=new Date(__BUILD_TIME__);
          const dia=d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"});
          const hora=d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"});
          return `atualizado em ${dia} às ${hora}`;
        })()}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function OnTheRocks(){
  const [user,setUser]=useState(null);
  const [syncing,setSyncing]=useState(false);

  const [customRecipes,setCustomRecipes]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_custom")||"[]");}catch{return[];}});
  const [favs,setFavs]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_favs")||"[]");}catch{return[];}});
  const [comanda,setComanda]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_comanda")||"[]");}catch{return[];}});
  const [owned,setOwned]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_owned")||"[]");}catch{return[];}});
  const [tried,setTried]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_tried")||"[]");}catch{return[];}});
  const [customSpirits,setCustomSpirits]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_spirits")||"[]");}catch{return[];}});
  const [overrides,setOverrides]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_overrides")||"{}");}catch{return{};}});

  // ── Captura redirect do Google (mobile) ──
  useEffect(()=>{
    getRedirectResult(auth).catch(()=>{});
  },[]);

  // ── Altura real do viewport no mobile (fix para browser chrome) ──
  useEffect(()=>{
    const update=()=>{
      const h=window.visualViewport?.height??window.innerHeight;
      document.documentElement.style.setProperty('--vh',`${h*0.01}px`);
    };
    update();
    window.visualViewport?.addEventListener('resize',update);
    window.visualViewport?.addEventListener('scroll',update);
    window.addEventListener('resize',update);
    return()=>{
      window.visualViewport?.removeEventListener('resize',update);
      window.visualViewport?.removeEventListener('scroll',update);
      window.removeEventListener('resize',update);
    };
  },[]);

  // ── Auth listener ──
  useEffect(()=>{
    return onAuthStateChanged(auth, async u => {
      setUser(u);
      if(u){
        setSyncing(true);
        try{
          const ref = doc(db,"users",u.uid);
          const snap = await getDoc(ref);
          if(snap.exists()){
            const d = snap.data();
            if(d.custom)    setCustomRecipes(d.custom);
            if(d.favs)      setFavs(d.favs);
            if(d.comanda)   setComanda(d.comanda);
            if(d.owned)     setOwned(d.owned);
            if(d.tried)     setTried(d.tried);
            if(d.spirits)   setCustomSpirits(d.spirits);
            if(d.overrides) setOverrides(d.overrides);
          }
        }catch(e){console.error(e);}
        setSyncing(false);
      }
    });
  },[]);

  // ── Sync to Firestore when data changes ──
  const syncToFirestore = useCallback(async (data) => {
    if(!auth.currentUser) return;
    try{ await setDoc(doc(db,"users",auth.currentUser.uid), data, {merge:true}); }
    catch(e){ console.error(e); }
  },[]);

  useEffect(()=>{try{localStorage.setItem("otr_custom",JSON.stringify(customRecipes));}catch{}; syncToFirestore({custom:customRecipes});},[customRecipes]);
  useEffect(()=>{try{localStorage.setItem("otr_favs",JSON.stringify(favs));}catch{}; syncToFirestore({favs});},[favs]);
  useEffect(()=>{try{localStorage.setItem("otr_comanda",JSON.stringify(comanda));}catch{}; syncToFirestore({comanda});},[comanda]);
  useEffect(()=>{try{localStorage.setItem("otr_owned",JSON.stringify(owned));}catch{}; syncToFirestore({owned});},[owned]);
  useEffect(()=>{try{localStorage.setItem("otr_tried",JSON.stringify(tried));}catch{}; syncToFirestore({tried});},[tried]);
  useEffect(()=>{try{localStorage.setItem("otr_spirits",JSON.stringify(customSpirits));}catch{}; syncToFirestore({spirits:customSpirits});},[customSpirits]);
  useEffect(()=>{try{localStorage.setItem("otr_overrides",JSON.stringify(overrides));}catch{}; syncToFirestore({overrides});},[overrides]);

  useEffect(()=>{
    if(!("wakeLock" in navigator))return;
    let lock=null;
    const request=async()=>{try{lock=await navigator.wakeLock.request("screen");}catch{}};
    const onVisible=()=>{if(document.visibilityState==="visible")request();};
    request();
    document.addEventListener("visibilitychange",onVisible);
    return()=>{document.removeEventListener("visibilitychange",onVisible);lock?.release();};
  },[]);

  const allRecipes=useMemo(()=>[...BASE_RECIPES.map(r=>overrides[r.name]?{...r,...overrides[r.name]}:r),...customRecipes],[customRecipes,overrides]);

  const [activeStyle,setActiveStyle]=useState(null);
  const [activeSpirits,setActiveSpirits]=useState([]);
  const [search,setSearch]=useState("");
  const [spiritSearch,setSpiritSearch]=useState("");
  const [open,setOpen]=useState(null);
  const [editing,setEditing]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [sort,setSort]=useState("nome");
  const [filterMode,setFilterMode]=useState("tudo");
  const [filterAnd,setFilterAnd]=useState(false);
  const [sidebarTab,setSidebarTab]=useState("família");
  const [mobileTab,setMobileTab]=useState("descobrir");
  const [filterSheet,setFilterSheet]=useState(null);
  const importRef=useRef();
  const [swipeHistory,setSwipeHistory]=useState(()=>{try{const s=localStorage.getItem("otr_swipeHistory");return s?JSON.parse(s):[];}catch{return [];}});
  const [swipeHistIdx,setSwipeHistIdx]=useState(()=>{try{const s=localStorage.getItem("otr_swipeHistIdx");return s?parseInt(s,10):0;}catch{return 0;}});

  const allSpirits=useMemo(()=>[...new Set([...allRecipes.flatMap(r=>r.categories.filter(c=>SPIRIT_CATS.has(c))),...customSpirits])].sort(),[allRecipes,customSpirits]);
  const visibleSpirits=useMemo(()=>allSpirits.filter(s=>s.toLowerCase().includes(spiritSearch.toLowerCase())),[allSpirits,spiritSearch]);

  const [ratingPopup,setRatingPopup]=useState(null);

  const toggleFav=n=>setFavs(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);
  const toggleComanda=n=>setComanda(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);
  const toggleOwned=s=>setOwned(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const toggleTried=n=>setTried(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);
  const handleTried=useCallback(name=>{
    setTried(p=>{
      const alreadyTried=p.includes(name);
      if(!alreadyTried){
        const recipe=allRecipes.find(r=>r.name===name);
        if(recipe) setTimeout(()=>setRatingPopup(recipe),0);
      }
      return alreadyTried?p.filter(x=>x!==name):[...p,name];
    });
  },[allRecipes]);
  const toggleSpirit=s=>setActiveSpirits(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const clearAll=()=>{setActiveStyle(null);setActiveSpirits([]);setSearch("");setFilterMode("tudo");};
  const hasFilters=!!(activeStyle||activeSpirits.length>0||search||filterMode!=="tudo");

  // ── Back button — navega dentro do app ──
  const backRef=useRef({});
  backRef.current={open,showForm,editing,mobileTab,activeStyle,activeSpirits,search,filterMode};
  useEffect(()=>{
    const push=()=>window.history.pushState({otr:true},"");
    push();
    const onPop=()=>{
      const s=backRef.current;
      if(s.open){setOpen(null);push();return;}
      if(s.showForm||s.editing){setShowForm(false);setEditing(null);push();return;}
      if(s.mobileTab!=="descobrir"){setMobileTab("descobrir");push();return;}
      if(s.activeStyle||s.activeSpirits.length||s.search||s.filterMode!=="tudo"){
        setActiveStyle(null);setActiveSpirits([]);setSearch("");setFilterMode("tudo");push();return;
      }
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  const hasAllIngredients=useCallback(recipe=>{
    const spirits=recipe.categories.filter(c=>SPIRIT_CATS.has(c)||customSpirits.includes(c));
    return spirits.length>0&&spirits.every(s=>owned.includes(s));
  },[owned,customSpirits]);

  const surpriseMe=useCallback(()=>{
    const pool=allRecipes.filter(r=>!tried.includes(r.name));
    if(!pool.length)return;
    setOpen(pool[Math.floor(Math.random()*pool.length)]);
  },[allRecipes,tried]);

  const saveRecipe=useCallback(recipe=>{
    if(!recipe.custom){
      // receita base: salva como override para não criar duplicata
      const {name,...fields}=recipe;
      setOverrides(p=>({...p,[name]:{...(p[name]||{}),...fields}}));
    } else {
      setCustomRecipes(p=>{const idx=p.findIndex(r=>r.id===recipe.id);if(idx>=0){const n=[...p];n[idx]=recipe;return n;}return[...p,recipe];});
    }
    setShowForm(false);setEditing(null);
  },[]);

  const deleteRecipe=useCallback(recipe=>{setCustomRecipes(p=>p.filter(r=>r.id!==recipe.id));setOpen(null);},[]);

  const noteRecipe=useCallback((recipe,notes)=>{
    if(recipe.custom){setCustomRecipes(p=>p.map(r=>r.name===recipe.name?{...r,notes}:r));}
    else{setOverrides(p=>({...p,[recipe.name]:{...(p[recipe.name]||{}),notes}}));}
  },[]);

  const rateRecipe=useCallback((recipe,rating)=>{
    if(recipe.custom){setCustomRecipes(p=>p.map(r=>r.name===recipe.name?{...r,rating}:r));}
    else{setOverrides(p=>({...p,[recipe.name]:{...(p[recipe.name]||{}),rating}}));}
    setOpen(prev=>prev?{...prev,rating}:prev);
  },[]);

  const exportJSON=()=>{
    const data=JSON.stringify({custom:customRecipes,favs,owned},null,2);
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));a.download=`onthеrocks_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();
  };

  const importJSON=e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!window.confirm("Importar vai sobrescrever suas receitas, favoritos e ingredientes. Continuar?")){e.target.value="";return;}
    const r=new FileReader();
    r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.custom)setCustomRecipes(d.custom);if(d.favs)setFavs(d.favs);if(d.owned)setOwned(d.owned);}catch{alert("Arquivo inválido.");}};
    r.readAsText(file);e.target.value="";
  };

  // filtro efetivo para mobile favoritos
  const effectiveFilterMode = mobileTab==="favoritos" ? "favs" : filterMode;

  const filtered=useMemo(()=>{
    let list=allRecipes.filter(r=>{
      if(!search&&activeStyle!=="Preparos Caseiros"&&r.categories.includes("Preparos Caseiros"))return false;
      if(effectiveFilterMode==="favs"&&!favs.includes(r.name))return false;
      if(effectiveFilterMode==="tenho"&&!hasAllIngredients(r))return false;
      if(effectiveFilterMode==="custom"&&!r.custom)return false;
      if(effectiveFilterMode==="naoprovei"&&tried.includes(r.name))return false;
      if(effectiveFilterMode==="provados"&&!tried.includes(r.name))return false;
      if(activeStyle&&!r.categories.includes(activeStyle))return false;
      if(activeSpirits.length>0&&!activeSpirits.every(s=>r.categories.includes(s)))return false;
      if(search){const q=norm(search);return norm(r.name).includes(q)||r.ingredients.some(i=>norm(i).includes(q))||r.categories.some(c=>norm(c).includes(q))||norm(r.notes).includes(q);}
      return true;
    });
    if(sort==="rating")list=[...list].sort((a,b)=>b.rating-a.rating);
    else if(sort==="ingredientes")list=[...list].sort((a,b)=>a.ingredients.length-b.ingredients.length);
    else list=[...list].sort((a,b)=>a.name.localeCompare(b.name,"pt"));
    return list;
  },[allRecipes,activeStyle,activeSpirits,search,favs,owned,tried,sort,effectiveFilterMode,hasAllIngredients]);

  // swipe filtrado: quando há filtro ativo usa a lista filtrada em ordem
  const swipeFiltered=useMemo(()=>hasFilters?filtered:null,[hasFilters,filtered]);

  const drinkRecipes=useMemo(()=>allRecipes.filter(r=>!r.categories.includes("Preparos Caseiros")),[allRecipes]);

  // persiste histórico de swipe
  useEffect(()=>{try{localStorage.setItem("otr_swipeHistory",JSON.stringify(swipeHistory));}catch{}},[swipeHistory]);
  useEffect(()=>{try{localStorage.setItem("otr_swipeHistIdx",String(swipeHistIdx));}catch{}},[swipeHistIdx]);

  // inicializa histórico quando receitas carregam
  useEffect(()=>{
    if(drinkRecipes.length&&swipeHistory.length===0){
      const first=drinkRecipes[Math.floor(Math.random()*drinkRecipes.length)];
      setSwipeHistory([first.name]);
    }
  },[drinkRecipes.length]);// eslint-disable-line

  const swipeRecipe=useMemo(()=>{
    if(swipeFiltered){
      if(!swipeFiltered.length)return null;
      return swipeFiltered[Math.min(swipeHistIdx,swipeFiltered.length-1)];
    }
    if(!swipeHistory.length||!drinkRecipes.length)return null;
    const name=swipeHistory[Math.min(swipeHistIdx,swipeHistory.length-1)];
    return drinkRecipes.find(r=>r.name===name)||drinkRecipes[0];
  },[drinkRecipes,swipeHistory,swipeHistIdx,swipeFiltered]);

  const pickDifferentFamily=useCallback((currentRecipe)=>{
    const currentFamily=currentRecipe?.categories.find(c=>STYLE_CATS.has(c));
    const pool=drinkRecipes.filter(r=>r.name!==currentRecipe?.name&&r.categories.find(c=>STYLE_CATS.has(c))!==currentFamily);
    const src=pool.length?pool:drinkRecipes.filter(r=>r.name!==currentRecipe?.name);
    if(!src.length)return currentRecipe;
    return src[Math.floor(Math.random()*src.length)];
  },[drinkRecipes]);

  const nextSwipeRecipe=useCallback(()=>{
    if(swipeFiltered){
      setSwipeHistIdx(i=>Math.min(i+1,swipeFiltered.length-1));
      return;
    }
    setSwipeHistIdx(idx=>{
      if(idx<swipeHistory.length-1)return idx+1;
      const next=pickDifferentFamily(swipeRecipe);
      if(next)setSwipeHistory(h=>[...h,next.name]);
      return idx+1;
    });
  },[swipeHistory.length,swipeRecipe,pickDifferentFamily,swipeFiltered]);

  const prevSwipeRecipe=useCallback(()=>{
    setSwipeHistIdx(i=>Math.max(0,i-1));
  },[]);

  // reset idx ao mudar filtros
  useEffect(()=>{setSwipeHistIdx(0);},[activeStyle,activeSpirits,filterMode,search]);

  useEffect(()=>{
    if(mobileTab==="descobrir"){
      document.documentElement.style.overflow="hidden";
    } else {
      document.documentElement.style.overflow="";
    }
    return()=>{document.documentElement.style.overflow="";};
  },[mobileTab]);

  const sidebarProps={sidebarTab,setSidebarTab,allRecipes,activeStyle,setActiveStyle,allSpirits,visibleSpirits,owned,toggleOwned,filterMode,setFilterMode,activeSpirits,toggleSpirit,spiritSearch,setSpiritSearch,hasFilters,clearAll,customSpirits,setCustomSpirits,setMobileTab};

  return(
    <div style={{fontFamily:"Archivo,sans-serif",minHeight:"100vh",background:"#070707",color:"#F0EBE1",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Archivo:wght@300;400;500;600;700&display=swap');
        html,body{background:#070707}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(240,235,225,0.08);border-radius:2px}
        input,button,textarea{font-family:Archivo,sans-serif;outline:none;cursor:pointer}textarea{cursor:text}
        .dsb{display:flex!important}
        .mnv{display:none}
        @media(max-width:700px){
          .dsb{display:none!important}
          .mnv{display:flex!important}
          .lay{grid-template-columns:1fr!important;min-height:unset!important}
          .hdr-actions{display:none!important}
          .hdr-filters{display:none!important}
          .hdr-search{display:none!important}
          body{padding-bottom:65px}
        }
      `}</style>
      <input ref={importRef} type="file" accept=".json" onChange={importJSON} style={{display:"none"}}/>

      {/* ── HEADER ── */}
      <header style={{padding:"14px 22px 12px",borderBottom:"1px solid rgba(240,235,225,0.05)",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",background:"#070707",position:"sticky",top:0,zIndex:200}}>
        <button onClick={()=>{setMobileTab("descobrir");setActiveStyle(null);setActiveSpirits([]);setFilterMode("tudo");setSearch("");}} style={{marginRight:"auto",lineHeight:1,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <div style={{height:1,width:18,background:"rgba(240,235,225,0.2)"}}/>
            <span style={{fontSize:9,letterSpacing:5,textTransform:"uppercase",color:"rgba(240,235,225,0.58)",fontWeight:300}}>ON THE</span>
            <div style={{height:1,width:18,background:"rgba(240,235,225,0.2)"}}/>
          </div>
          <span style={{fontSize:28,letterSpacing:4,textTransform:"uppercase",fontWeight:900,display:"block",lineHeight:1,color:"#F0EBE1"}}>ROCKS</span>
          <span style={{fontSize:7,letterSpacing:4,textTransform:"uppercase",color:"rgba(160,120,90,0.7)",display:"block",marginTop:3,fontWeight:400}}>COCKTAIL RECIPES</span>
        </button>

        <div style={{display:"flex",flexDirection:"column",gap:1,marginRight:4}}>
          <span style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700}}>{drinkRecipes.length} receitas</span>
          <button onClick={()=>{setFilterMode(filterMode==="provados"?"tudo":"provados");setMobileTab("explorar");}} style={{background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"left",fontFamily:"Archivo,sans-serif"}}>
            <span style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:filterMode==="provados"?"#4ADE80":"#4ADE80",fontWeight:700,opacity:filterMode==="provados"?1:.8,textDecoration:filterMode==="provados"?"underline":"none"}}>{tried.length} provados</span>
          </button>
        </div>

        <div className="hdr-filters" style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[["tudo","Todos"],["favs",`♥${favs.length?` ${favs.length}`:""}`],["naoprovei","Não provei"],["tenho","O que tenho"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilterMode(v)} style={{padding:"5px 11px",borderRadius:3,fontSize:10,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,background:filterMode===v?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${filterMode===v?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.08)"}`,color:filterMode===v?"#A0785A":"rgba(240,235,225,0.3)",transition:"all .15s"}}>{l}</button>
          ))}
        </div>

        <input className="hdr-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="buscar drink, ingrediente ou técnica…" style={{background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:3,padding:"7px 12px",color:"#F0EBE1",fontSize:12,width:220}} onFocus={e=>e.target.style.borderColor="rgba(160,120,90,0.35)"} onBlur={e=>e.target.style.borderColor="rgba(240,235,225,0.08)"}/>

        <div className="hdr-actions" style={{display:"flex",gap:6}}>
          <button onClick={surpriseMe} style={{padding:"7px 12px",borderRadius:3,background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.3)",color:"#A78BFA",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>✦ Surpreenda-me</button>
          <button onClick={()=>setShowForm(true)} style={{padding:"7px 14px",borderRadius:3,background:"rgba(160,120,90,0.15)",border:"1px solid rgba(160,120,90,0.5)",color:"#A0785A",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>+ Receita</button>
          <button onClick={exportJSON} title="Exportar" style={{padding:"7px 10px",borderRadius:3,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.07)",color:"rgba(240,235,225,0.52)",fontSize:13}}>↓</button>
          <button onClick={()=>importRef.current?.click()} title="Importar" style={{padding:"7px 10px",borderRadius:3,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.07)",color:"rgba(240,235,225,0.52)",fontSize:13}}>↑</button>
        </div>
      </header>

      {/* ── LAYOUT ── */}
      <div className="lay" style={{display:"grid",gridTemplateColumns:"240px 1fr",minHeight:"calc(100vh - 70px)"}}>
        <aside className="dsb" style={{borderRight:"1px solid rgba(240,235,225,0.05)",padding:"20px 15px",position:"sticky",top:70,height:"calc(100vh - 70px)",overflowY:"auto",flexDirection:"column"}}>
          <SidebarContent {...sidebarProps}/>
        </aside>

        <main className="app-main" style={{padding:"18px 22px 24px"}}>
          {/* mobile: tabs de conteúdo */}
          {mobileTab==="descobrir"&&!swipeRecipe ? (
            <div style={{position:"fixed",inset:"70px 0 65px 0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,opacity:.45}}>
              <span style={{fontSize:28}}>🥃</span>
              <span style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.5)"}}>nenhuma receita encontrada</span>
            </div>
          ) : mobileTab==="descobrir"&&swipeRecipe ? (
            <div style={{position:"fixed",inset:"70px 0 65px 0",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",touchAction:"none"}}>
              {/* fundo atmosférico */}
              {(()=>{const th=getTheme(swipeRecipe.categories);return(<>
                <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 80% 60% at 50% 100%, ${th.accent}18 0%, transparent 70%)`,pointerEvents:"none",transition:"background .6s ease"}}/>
                <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 50% 40% at 50% 0%, ${th.accent}08 0%, transparent 60%)`,pointerEvents:"none"}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg, transparent, ${th.accent}44, transparent)`,pointerEvents:"none"}}/>
                {hasFilters&&<div style={{position:"absolute",top:8,left:0,right:0,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
                  <span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:th.accent,opacity:.55}}>{swipeHistIdx+1} / {swipeFiltered?.length}</span>
                </div>}
              </>);})()}
              <SwipeCard key={swipeRecipe.name} recipe={swipeRecipe} onComanda={()=>toggleComanda(swipeRecipe.name)} isComanda={comanda.includes(swipeRecipe.name)} onTried={()=>handleTried(swipeRecipe.name)} isTried={tried.includes(swipeRecipe.name)} onNext={nextSwipeRecipe} onPrev={prevSwipeRecipe} hasPrev={swipeHistIdx>0} onOpen={r=>setOpen(r)}/>
            </div>
          ) : mobileTab==="ingredientes" ? (
            <div style={{paddingBottom:100,display:"flex",flexDirection:"column",gap:0}}>
              {/* header */}
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontSize:9,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700}}>Meu Bar</div>
                  {owned.length>0&&(
                    <button onClick={()=>setOwned([])} style={{padding:"3px 10px",borderRadius:20,fontSize:10,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.35)",cursor:"pointer",fontFamily:"Archivo,sans-serif",letterSpacing:.5}}>limpar</button>
                  )}
                </div>
                <div style={{fontSize:13,color:"rgba(240,235,225,0.35)",lineHeight:1.5}}>Marque o que você tem em casa e descubra o que pode fazer.</div>
              </div>
              {/* spirits em grid */}
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {allSpirits.map(s=>{
                  const has=owned.includes(s);
                  return(
                    <button key={s} onClick={()=>toggleOwned(s)}
                      style={{padding:"8px 14px",borderRadius:20,fontSize:12,
                        background:has?"rgba(160,120,90,0.15)":"rgba(240,235,225,0.04)",
                        border:`1px solid ${has?"rgba(160,120,90,0.55)":"rgba(240,235,225,0.1)"}`,
                        color:has?"#C8A96E":"rgba(240,235,225,0.38)",
                        cursor:"pointer",fontFamily:"Archivo,sans-serif",
                        transition:"all .15s",
                        filter:has?`drop-shadow(0 0 6px rgba(160,120,90,0.3))`:"none"}}>
                      {has&&<span style={{marginRight:5,fontSize:10}}>✓</span>}{s}
                    </button>
                  );
                })}
              </div>
              {owned.length>1&&(
                <button onClick={()=>setFilterAnd(p=>!p)} style={{display:"flex",alignItems:"center",gap:8,marginTop:16,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"Archivo,sans-serif"}}>
                  <div style={{width:32,height:18,borderRadius:9,background:filterAnd?"rgba(160,120,90,0.5)":"rgba(240,235,225,0.08)",border:`1px solid ${filterAnd?"rgba(160,120,90,0.8)":"rgba(240,235,225,0.15)"}`,position:"relative",transition:"all .2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:3,left:filterAnd?14:3,width:10,height:10,borderRadius:5,background:filterAnd?"#C8A96E":"rgba(240,235,225,0.3)",transition:"left .2s"}}/>
                  </div>
                  <span style={{fontSize:11,color:filterAnd?"#C8A96E":"rgba(240,235,225,0.35)",transition:"color .2s",letterSpacing:.3}}>no mesmo drink</span>
                </button>
              )}
              {/* adicionar bebida customizada */}
              <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid rgba(240,235,225,0.06)"}}>
                <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.35)",fontWeight:700,marginBottom:10}}>Adicionar bebida</div>
                <div style={{display:"flex",gap:8}}>
                  <input value={spiritSearch} onChange={e=>setSpiritSearch(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&spiritSearch.trim()){setCustomSpirits(p=>[...new Set([...p,spiritSearch.trim()])]);setSpiritSearch("");}}}
                    placeholder="ex: Fernet, Licor 43…"
                    style={{flex:1,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:6,padding:"10px 14px",color:"#F0EBE1",fontSize:13,outline:"none",fontFamily:"Archivo,sans-serif"}}/>
                  <button onClick={()=>{if(spiritSearch.trim()){setCustomSpirits(p=>[...new Set([...p,spiritSearch.trim()])]);setSpiritSearch("");}}}
                    style={{padding:"10px 16px",borderRadius:6,background:"rgba(160,120,90,0.12)",border:"1px solid rgba(160,120,90,0.3)",color:"#A0785A",fontSize:16,cursor:"pointer"}}>+</button>
                </div>
                {customSpirits.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>{customSpirits.map(s=><button key={s} onClick={()=>setCustomSpirits(p=>p.filter(x=>x!==s))} style={{padding:"5px 10px",borderRadius:20,fontSize:11,background:"rgba(160,120,90,0.08)",border:"1px solid rgba(160,120,90,0.2)",color:"rgba(160,120,90,0.6)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s} ×</button>)}</div>}
              </div>
              {/* receitas possíveis inline */}
              {owned.length>0&&(()=>{
                const possiveis=filterAnd&&owned.length>1
                  ?allRecipes.filter(r=>owned.every(s=>r.categories.includes(s)))
                  :allRecipes.filter(r=>hasAllIngredients(r));
                if(!possiveis.length)return null;
                return(
                  <div style={{marginTop:28}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:owned.length>1?10:14}}>
                      <div style={{fontSize:9,letterSpacing:3,textTransform:"uppercase",color:"rgba(160,120,90,0.7)",fontWeight:700}}>
                        Você pode fazer · <span style={{color:"#C8A96E"}}>{possiveis.length}</span>
                      </div>
                      <button onClick={()=>{if(filterAnd&&owned.length>1){setActiveSpirits(owned);setFilterMode("tudo");}else{setFilterMode("tenho");}setMobileTab("explorar");}}
                        style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(240,235,225,0.3)",background:"none",border:"none",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>
                        ver todos →
                      </button>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {possiveis.slice(0,8).map(r=>{
                        const th=getTheme(r.categories);
                        return(
                          <button key={r.name} onClick={()=>setOpen(r)}
                            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,
                              background:th.bg,border:`1px solid ${th.border}33`,
                              cursor:"pointer",fontFamily:"Archivo,sans-serif",textAlign:"left",
                              transition:"border-color .15s"}}
                            onMouseEnter={e=>e.currentTarget.style.borderColor=th.border+"66"}
                            onMouseLeave={e=>e.currentTarget.style.borderColor=th.border+"33"}>
                            <div style={{width:6,height:6,borderRadius:1,background:th.accent,flexShrink:0}}/>
                            <span style={{flex:1,fontSize:13,color:"rgba(240,235,225,0.75)",fontWeight:500}}>{r.name}</span>
                            {r.rating>0&&<span style={{fontSize:10,color:th.accent,opacity:.7}}>{"★".repeat(r.rating)}</span>}
                            <span style={{fontSize:11,color:"rgba(240,235,225,0.2)"}}>›</span>
                          </button>
                        );
                      })}
                      {possiveis.length>8&&(
                        <button onClick={()=>{if(filterAnd&&owned.length>1){setActiveSpirits(owned);setFilterMode("tudo");}else{setFilterMode("tenho");}setMobileTab("explorar");}}
                          style={{padding:"10px",borderRadius:8,background:"rgba(240,235,225,0.03)",border:"1px solid rgba(240,235,225,0.07)",color:"rgba(240,235,225,0.3)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif",letterSpacing:1}}>
                          +{possiveis.length-8} receitas
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : mobileTab==="comanda" ? (
            <div style={{paddingBottom:100}}>
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontSize:9,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700}}>Comanda</div>
                  {comanda.length>0&&(
                    <button onClick={()=>setComanda([])} style={{padding:"3px 10px",borderRadius:20,fontSize:10,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.35)",cursor:"pointer",fontFamily:"Archivo,sans-serif",letterSpacing:.5}}>limpar</button>
                  )}
                </div>
                <div style={{fontSize:13,color:"rgba(240,235,225,0.35)",lineHeight:1.5}}>Os drinks que você quer pedir na próxima noite.</div>
              </div>
              {comanda.length===0?(
                <div style={{textAlign:"center",padding:"80px 0",color:"rgba(240,235,225,0.3)"}}>
                  <div style={{fontSize:44,marginBottom:14}}>◫</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontStyle:"italic",marginBottom:8}}>Comanda vazia</div>
                  <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>Adicione drinks pela ficha de cada receita</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {allRecipes.filter(r=>comanda.includes(r.name)).map(r=>{
                    const th=getTheme(r.categories);
                    const styleTag=r.categories.find(c=>STYLE_CATS.has(c));
                    const spiritTag=r.categories.find(c=>SPIRIT_CATS.has(c));
                    return(
                      <div key={r.name} onClick={()=>setOpen(r)}
                        style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:6,background:th.bg,border:`1px solid ${th.border}33`,cursor:"pointer",position:"relative"}}>
                        <div style={{filter:`drop-shadow(0 0 10px ${th.accent}88)`,flexShrink:0}}>
                          <GlassIcon categories={r.categories} color={th.accent} size={36} opacity={0.5}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,fontWeight:700,color:"#F0EBE1",lineHeight:1.1,marginBottom:3}}>{r.name}</div>
                          <div style={{display:"flex",gap:6}}>
                            {styleTag&&<span style={{fontSize:8,letterSpacing:2,textTransform:"uppercase",color:th.accent}}>{styleTag}</span>}
                            {spiritTag&&<span style={{fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(240,235,225,0.4)"}}>{spiritTag}</span>}
                          </div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();toggleComanda(r.name);}}
                          style={{background:"none",border:"none",fontSize:18,color:"rgba(160,120,90,0.6)",cursor:"pointer",padding:"4px 6px",flexShrink:0}}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : mobileTab==="perfil" ? (
            <ProfileTab allRecipes={allRecipes} drinkCount={drinkRecipes.length} tried={tried} favs={favs} owned={owned} customRecipes={customRecipes} exportJSON={exportJSON} importRef={importRef} user={user} syncing={syncing} onGoTo={f=>{setFilterMode(["naoprovei","favs","custom","tenho","provados","tudo"].includes(f)?f:"tudo");setMobileTab("explorar");}} onOpenRecipe={r=>{setOpen(r);setMobileTab("explorar");}} onRestore={()=>{if(window.confirm("Restaurar todas as receitas base para o original? Suas notas e avaliações também serão apagadas."))setOverrides({});}} onAddRecipe={()=>setShowForm(true)}/>
          ) : (
            <>
              {/* mobile: botões família + spirit + filtros */}
              <div className="mnv" style={{display:"none",gap:6,flexWrap:"wrap",marginBottom:10,paddingBottom:4}}>
                {/* família */}
                <button onClick={()=>setFilterSheet(filterSheet==="familia"?null:"familia")}
                  style={{padding:"9px 16px",borderRadius:20,fontSize:13,fontWeight:600,flexShrink:0,cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .15s",
                    background:activeStyle?(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).bg:"rgba(240,235,225,0.04)",
                    border:`1px solid ${activeStyle?(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).border+"66":"rgba(240,235,225,0.09)"}`,
                    color:activeStyle?(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).label:"rgba(240,235,225,0.5)"}}>
                  {activeStyle||"Família"}{activeStyle?" ×":""}
                </button>
                {/* spirit */}
                <button onClick={()=>setFilterSheet(filterSheet==="spirit"?null:"spirit")}
                  style={{padding:"9px 16px",borderRadius:20,fontSize:13,fontWeight:600,flexShrink:0,cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .15s",
                    background:activeSpirits.length?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                    border:`1px solid ${activeSpirits.length?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                    color:activeSpirits.length?"#C8A96E":"rgba(240,235,225,0.5)"}}>
                  {activeSpirits.length?activeSpirits[0]+(activeSpirits.length>1?` +${activeSpirits.length-1}`:"")+" ×":"Spirit"}
                </button>
                {/* filtros rápidos */}
                {[["favs","♥"],["naoprovei","Não provei"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setFilterMode(filterMode===v?"tudo":v)} style={{padding:"9px 16px",borderRadius:20,fontSize:13,fontWeight:600,flexShrink:0,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .15s",
                    background:filterMode===v?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                    border:`1px solid ${filterMode===v?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                    color:filterMode===v?"#C8A96E":"rgba(240,235,225,0.5)"}}>
                    {l}
                  </button>
                ))}
                {(activeStyle||activeSpirits.length||filterMode!=="tudo")&&(
                  <button onClick={clearAll} style={{padding:"9px 16px",borderRadius:20,fontSize:13,flexShrink:0,cursor:"pointer",fontFamily:"Archivo,sans-serif",background:"none",border:"1px solid rgba(240,235,225,0.07)",color:"rgba(240,235,225,0.3)"}}>limpar</button>
                )}
              </div>
              {/* sheet família */}
              {filterSheet==="familia"&&(
                <div className="mnv" style={{display:"none",flexDirection:"column",background:"rgba(15,13,10,0.98)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:10,padding:"14px 14px 10px",marginBottom:12,gap:8}}>
                  <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.35)",fontWeight:700,marginBottom:4}}>Família & Técnica</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {[...FAMILY_GROUPS.flatMap(g=>g.items),...TECHNIQUES].filter(s=>allRecipes.some(r=>r.categories.includes(s))).map(s=>{
                      const active=activeStyle===s;
                      const th=TYPE_THEME[s]||TYPE_THEME["_default"];
                      return(<button key={s} onClick={()=>{setActiveStyle(active?null:s);setFilterSheet(null);}} style={{padding:"7px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .12s",
                        background:active?th.bg:"rgba(240,235,225,0.04)",
                        border:`1px solid ${active?th.border+"66":"rgba(240,235,225,0.09)"}`,
                        color:active?th.label:"rgba(240,235,225,0.45)"}}>{s}</button>);
                    })}
                  </div>
                </div>
              )}
              {/* sheet spirit */}
              {filterSheet==="spirit"&&(
                <div className="mnv" style={{display:"none",flexDirection:"column",background:"rgba(15,13,10,0.98)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:10,padding:"14px 14px 10px",marginBottom:12,gap:8}}>
                  <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.35)",fontWeight:700,marginBottom:4}}>Spirit</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {allSpirits.map(s=>{
                      const active=activeSpirits.includes(s);
                      return(<button key={s} onClick={()=>{toggleSpirit(s);setFilterSheet(null);}} style={{padding:"7px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .12s",
                        background:active?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${active?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,color:active?"#C8A96E":"rgba(240,235,225,0.45)"}}>{s}</button>);
                    })}
                  </div>
                </div>
              )}
              {/* family description */}
              {activeStyle&&FAMILY_DESC[activeStyle]&&(
                <div className="mnv" style={{marginBottom:14,padding:"12px 14px",borderRadius:6,background:`${(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).bg}cc`,border:`1px solid ${(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).border}44`}}>
                  <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).accent,fontWeight:700,marginBottom:6}}>{activeStyle}</div>
                  <p style={{margin:0,fontSize:12,color:"rgba(240,235,225,0.65)",lineHeight:1.65}}>{FAMILY_DESC[activeStyle]}</p>
                </div>
              )}              {/* mobile: busca */}
              <div className="mnv" style={{marginBottom:14}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="buscar drink, ingrediente…" style={{width:"100%",background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:3,padding:"9px 12px",color:"#F0EBE1",fontSize:13,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="rgba(160,120,90,0.35)"} onBlur={e=>e.target.style.borderColor="rgba(240,235,225,0.08)"}/>
              </div>

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <span style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700}}>
                  <span style={{color:"#A0785A"}}>{filtered.length}</span> drink{filtered.length!==1?"s":""}
                  {activeStyle&&` · ${activeStyle}`}
                </span>
                <div style={{display:"flex",gap:5}}>
                  {[["nome","A–Z"],["rating","★ Rating"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setSort(v)} style={{padding:"4px 10px",borderRadius:3,fontSize:10,letterSpacing:.5,background:sort===v?"rgba(160,120,90,0.1)":"transparent",border:`1px solid ${sort===v?"rgba(160,120,90,0.35)":"rgba(240,235,225,0.07)"}`,color:sort===v?"#A0785A":"rgba(240,235,225,0.26)",transition:"all .12s"}}>{l}</button>
                  ))}
                </div>
              </div>

              {filtered.length===0?(
                <div style={{textAlign:"center",padding:"80px 0",color:"rgba(240,235,225,0.52)"}}>
                  <div style={{fontSize:48,marginBottom:16}}>🍹</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontStyle:"italic",marginBottom:8}}>Nenhum drink encontrado</div>
                  <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>Tente outros filtros</div>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,paddingBottom:80}}>
                  {filtered.map(r=><DrinkCard key={r.id??r.name} recipe={r} isFav={favs.includes(r.name)} onFav={()=>toggleFav(r.name)} isTried={tried.includes(r.name)} onTried={()=>handleTried(r.name)} isComanda={comanda.includes(r.name)} onComanda={()=>toggleComanda(r.name)} hasAll={hasAllIngredients(r)} onClick={()=>setOpen(r)} onDelete={r.custom?()=>deleteRecipe(r):undefined}/>)}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── FAB + RECEITA (mobile, Explorar) ── */}
      {(mobileTab==="explorar"||mobileTab==="descobrir")&&(
        <button className="mnv" onClick={()=>setShowForm(true)}
          style={{position:"fixed",right:18,bottom:76,width:46,height:46,borderRadius:"50%",
            background:"rgba(160,120,90,0.92)",border:"1px solid rgba(200,169,110,0.5)",
            color:"#0A0906",fontSize:26,fontWeight:300,lineHeight:1,
            boxShadow:"0 4px 20px rgba(0,0,0,0.5)",cursor:"pointer",zIndex:90,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          +
        </button>
      )}

      {/* ── MOBILE NAV ── */}
      <MobileNav tab={mobileTab} setTab={t=>{window.scrollTo(0,0);setMobileTab(t);setOpen(null);if(t==="explorar"){setActiveStyle(null);setActiveSpirits([]);setFilterMode("tudo");setSearch("");}else{setSearch("");}if(t==="descobrir"){setFilterMode("tudo");}}} favCount={favs.length}/>

      {/* ── MODALS ── */}
      {open&&<Modal recipe={open} onClose={()=>setOpen(null)} isFav={favs.includes(open.name)} onFav={()=>toggleFav(open.name)} isTried={tried.includes(open.name)} onTried={()=>handleTried(open.name)} isComanda={comanda.includes(open.name)} onComanda={()=>toggleComanda(open.name)} onRating={r=>rateRecipe(open,r)} onNote={n=>noteRecipe(open,n)} onFilter={(type,val)=>{if(type==="style"){setActiveStyle(val);setActiveSpirits([]);}else{setActiveSpirits([val]);setActiveStyle(null);}setOpen(null);setMobileTab("explorar");}} onEdit={()=>{setEditing(open);setOpen(null);}} onDelete={()=>deleteRecipe(open)}/>}
      {(showForm||editing)&&<RecipeForm initial={editing} onSave={saveRecipe} onClose={()=>{setShowForm(false);setEditing(null);}}/>}
      {ratingPopup&&<RatingPopup recipe={ratingPopup} currentRating={allRecipes.find(r=>r.name===ratingPopup.name)?.rating||0} onRate={n=>rateRecipe(ratingPopup,n)} onClose={()=>setRatingPopup(null)}/>}
    </div>
  );
}
