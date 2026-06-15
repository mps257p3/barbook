import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { onAuthStateChanged, deleteUser } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { auth, db, signInWithGoogle, signOutUser, getRedirectResult } from "./firebase";

// ─── TEMA POR FAMÍLIA ─────────────────────────────────────────────────────────
const TYPE_THEME = {
  "Sour":           { bg:"#1C1400", border:"#C8860A", accent:"#F4A623", label:"#FFD580" },
  "Highball":       { bg:"#00141E", border:"#0A7EA4", accent:"#38BDF8", label:"#7DD3FC" },
  "Collins":        { bg:"#00140A", border:"#16803C", accent:"#4ADE80", label:"#86EFAC" },
  "Sparkling":      { bg:"#181600", border:"#BFA800", accent:"#E8D060", label:"#F5E98A" },
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
  "Frozen":         { bg:"#001418", border:"#0891B2", accent:"#22D3EE", label:"#A5F3FC" },
  "Tiki":           { bg:"#190B00", border:"#B45300", accent:"#F59E0B", label:"#FDE68A" },
  "Blended":        { bg:"#0A001A", border:"#6D28D9", accent:"#A78BFA", label:"#DDD6FE" },
  "Beer Highballs":    { bg:"#0F0800", border:"#A16207", accent:"#CA8A04", label:"#FEF08A" },
  "Preparos Caseiros": { bg:"#080E02", border:"#3D6B10", accent:"#74A828", label:"#AEDD72" },
  "_default":       { bg:"#151008", border:"#78614A", accent:"#C8A96E", label:"#E5C99E" },
};

const STYLE_PRIORITY = ["Não alcóolicos","Sour","Highball","Collins","Sparkling","Spritz","Fizz","Buck","Beer Highballs","Smash","Sling","Hot","Frozen","Tiki","Blended","Stirred","Shaken","Built","Preparos Caseiros"];
const STYLE_CATS = new Set(STYLE_PRIORITY);
const SPIRIT_CATS = new Set(["Absinto","Amaretto","Amaro","Aperol","Averna","Cachaça","Cachaça Envelhecida","Campari","Conhaque","Cynar","Drambuie","Espumante","Fernet","Gin","Ginger Beer","Jerez","Licor","Licor Beirão","Licor Strega","Lillet","Luxardo Maraschino","Mezcal","Pisco","Porto","Rum Branco","Rum Envelhecido","St‑Germain","Tequila","Triple Sec","Vermute Bianco","Vermute Rosso","Vermute seco","Vinho","Vodka","Whisky"]);
const ALL_SPIRIT_OPTIONS = [...SPIRIT_CATS].sort();
const FAMILY_GROUPS = [
  { label:"Família", items:["Sour","Highball","Collins","Sparkling","Spritz","Fizz","Sling","Buck","Beer Highballs","Smash","Hot","Frozen","Tiki","Blended","Não alcóolicos"] },
  { label:"Preparos", items:["Preparos Caseiros"] },
];
const TECHNIQUES = ["Stirred","Shaken","Built"];

const OCCASION_LIST = ["Refrescante","Reconfortante","Festa","Introspectivo","Descomplicado","Complexo","Digestivo","Piscina","Churrasco","A dois","Inesperados","Baixo álcool","Tropical"];

const OCCASION_TAGS = {
  "Pisco Sour":["Clássicos","Festa"],"Uva & Sal":["Introspectivo","Descomplicado"],"Flor de Pedra":["Introspectivo","A dois"],"Campo Seco":["Introspectivo","Inesperados"],"Pisco & Coco Tostado":["Inesperados"],"Verde Urbano":["Refrescante","Piscina"],"Noite em Lima":["Introspectivo"],"Pisco com Cerveja Branca":["Descomplicado","Churrasco"],"Seco de Maçã":["Digestivo","Inesperados"],"Pisco Terroso":["Inesperados"],
  "Sazerac":["Clássicos","Introspectivo"],"SAZERAC por Kennedy Nascimento":["Introspectivo","Complexo"],"Brandy Alexander":["Digestivo"],"Between the Sheets":["A dois"],"Stinger":["Digestivo","Descomplicado"],"French Connection":["Digestivo","Descomplicado"],"Brandy Crusta":["Clássicos","Complexo"],"Champs-Élysées":["Introspectivo","A dois"],
  "Sevilla Sour":["Refrescante","A dois"],"Smokey Martini":["Introspectivo"],"Spring Martini":["Introspectivo","A dois"],"Tom Collins":["Refrescante","Clássicos"],"Tom Gatsby":["Refrescante","Inesperados"],"Corpse Reviver #2":["Clássicos","Complexo"],"White Lady":["Clássicos","A dois"],"Hanky Panky":["Introspectivo","Inesperados"],"Southside":["Refrescante","Piscina"],"20th Century":["Introspectivo","Inesperados"],"Bee's Knees":["Clássicos","Refrescante"],"Last Word":["Clássicos","Complexo"],"Gimlet":["Clássicos","Descomplicado"],"Ramos Gin Fizz":["Complexo","Inesperados"],"The Clover Club":["Festa","A dois"],"Gibson":["Introspectivo","Clássicos"],"Angel Face":["Introspectivo","Inesperados"],"Casino":["Introspectivo","Clássicos"],"Paradise":["Refrescante"],"Monkey Gland":["Inesperados"],"Tuxedo":["Introspectivo","Complexo"],"Bijou":["Introspectivo","Complexo"],"Black Negroni":["Introspectivo"],"French Pearl":["Refrescante","Complexo"],"Alaska":["Introspectivo","Descomplicado"],"Pegu Club":["Introspectivo","Clássicos"],"Singapore Sling":["Clássicos","Complexo","Festa","Tropical"],"Industry Sour":["Inesperados"],"Vesper":["Clássicos","Introspectivo"],"Jardim Suspenso":["Refrescante","Piscina"],"Jardim Elétrico":["Refrescante","Piscina"],"Estufa":["Refrescante","Inesperados"],"Witch's Kiss":["Introspectivo"],"Strega Martini":["Introspectivo"],"French Gimlet":["Refrescante","A dois"],"Névoa Verde":["Introspectivo","Inesperados"],"Grapefruit Gimlet":["Refrescante","Descomplicado"],"Jardim Alto":["Refrescante","Piscina"],"Collins de Toranja com Ervas":["Refrescante"],"Rubi Tônico":["Refrescante"],
  "Whiskey Sour":["Clássicos","Refrescante"],"New York Sour":["Clássicos","A dois"],"Penicillin":["Clássicos","Complexo"],"Gold Rush":["Reconfortante"],"Paper Plane":["Clássicos","Introspectivo"],"Amaretto Sour":["Festa","Reconfortante"],"Boulevardier":["Reconfortante","Clássicos"],"Rob Roy":["Introspectivo","Clássicos"],"Vieux Carré":["Introspectivo","Clássicos"],"Toronto":["Introspectivo","Inesperados"],"Black Manhattan":["Introspectivo","Inesperados"],"Horse's Neck":["Reconfortante","Churrasco"],"Blood and Sand":["Inesperados","Complexo"],"Godfather":["Reconfortante","Digestivo"],"Irish Coffee":["Reconfortante","Clássicos"],"Hot Toddy":["Reconfortante","Introspectivo"],"Rusty Nail":["Reconfortante","Digestivo"],"Brown Derby":["Reconfortante","Introspectivo"],"Mint Julep":["Clássicos","Refrescante"],"Trinidad Sour":["Inesperados","Complexo"],"Remember the Maine":["Introspectivo","Inesperados"],"Tipperary":["Introspectivo","Complexo"],"Smoked Apple Whiskey Tonic":["Reconfortante"],"Elder Fashion":["Reconfortante","Introspectivo"],"Benevento Old Fashioned":["Reconfortante","Introspectivo"],"Pera & Fumaça":["Introspectivo","A dois"],"Dourado Frio":["Reconfortante","Introspectivo"],"Shanksjillo":["Digestivo","Inesperados"],"Autumn Smoke":["Reconfortante","Introspectivo"],"Spiced Nightcap":["Digestivo","Reconfortante"],"Highland Orchard":["Reconfortante"],"Honey & Heather":["Introspectivo","Inesperados"],"Golden Citrus Fizz":["Refrescante"],"Bitter Hive":["Inesperados"],"Barley Highball":["Introspectivo","Inesperados"],"Tropical Heather":["Inesperados"],"Illegal Sour":["Inesperados","Complexo"],"Suffering Bastard":["Inesperados","Complexo"],"Highball de Toranja e Bourbon":["Refrescante","Churrasco"],
  "Tommy's Margarita":["Clássicos","Refrescante"],"Spicy Margarita":["Festa","Churrasco"],"Ranch Water":["Refrescante","Piscina"],"Batanga":["Descomplicado","Churrasco"],"Naked and Famous":["Introspectivo","Inesperados"],"Mezcal Sour":["Reconfortante","Introspectivo"],"Matador":["Refrescante","Piscina","Tropical"],"Agave Spritz":["Refrescante","Piscina"],"Verde Brisa":["Refrescante","Piscina","Tropical"],"Sol e Sal":["Refrescante","Piscina"],"Sombra na Areia":["Piscina","Introspectivo"],"Cacto Poético":["Refrescante","Piscina"],"Bruma de Agave":["Refrescante","Piscina"],"Fumaça de Frutas":["Inesperados"],"Oaxacan Old Fashioned":["Introspectivo","Inesperados"],"Mezcal Negroni":["Introspectivo","Clássicos"],"Paloma":["Refrescante","Piscina","Clássicos"],"Paloma Cordial":["Refrescante","Piscina"],"Tequila Sunrise":["Festa","Piscina"],"Frozen Margarita":["Piscina","Festa"],"El Diablo":["Refrescante","Piscina"],"Bloody Maria":["Churrasco","Inesperados"],"Margarita Laranja Sanguínea e Aperol":["Refrescante","Churrasco"],"Key Lime Pie Margarita":["Inesperados"],"Margarita Ancho Chili e Toranja":["Inesperados","Churrasco"],"Margarita Picante de Pepino":["Refrescante","Churrasco"],"Mezcal & Cenoura Queimada":["Inesperados"],"Linha Clara":["Introspectivo","Inesperados"],
  "Bloody Mary":["Clássicos","Churrasco"],"Harvey Wallbanger":["Festa","Inesperados"],"Sex on the Beach":["Piscina","Festa"],"Lemon Drop":["Festa","Refrescante"],"Mule de Framboesa":["Refrescante","Festa"],"Caipiroska":["Refrescante","Churrasco"],"White Russian":["Digestivo","Reconfortante"],"White Russian de abóbora":["Digestivo","Inesperados"],"Black Russian":["Digestivo","Descomplicado"],"Espresso Martini":["Digestivo","Festa"],"Cosmopolitan":["Festa","Clássicos"],"French Martini":["Festa","A dois"],"Rose":["A dois"],"Russian Spring Punch":["Festa","Refrescante"],"Vodka Tônica":["Descomplicado","Refrescante"],"Citrus Cloud":["Refrescante","A dois"],"Floral Mule Leve":["Refrescante","Piscina"],"Solar Fizz":["Refrescante","Piscina"],"Flor de Pressa":["Festa","Piscina"],"Bitter & Melão":["Inesperados"],"Salty Dog":["Refrescante","Piscina"],
  "Daiquiri":["Clássicos","Refrescante"],"Frozen Daiquiri":["Piscina","Festa","Tropical"],"Cuba Libre":["Clássicos","Churrasco"],"El Presidente":["Clássicos","Introspectivo","Tropical"],"Planter's Punch":["Festa","Piscina","Tropical"],"Rum Old Fashioned":["Reconfortante","Introspectivo"],"Painkiller":["Piscina","Festa","Tropical"],"Mary Pickford":["Inesperados","Tropical"],"Piña Colada":["Piscina","Clássicos","Tropical"],"Mai Tai":["Clássicos","Festa","Tropical"],"Jungle Bird":["Festa","Complexo","Tropical"],"Jungle Bird Maraschino":["Festa","Complexo","Tropical"],"Old Cuban":["Clássicos","A dois"],"Yellow Bird":["Festa","Piscina","Tropical"],"Barracuda":["Festa","Piscina","Tropical"],"Zombie":["Festa","Complexo","Tropical"],"Kingston Mineral":["Introspectivo","Inesperados"],"Trópico Seco":["Introspectivo","Tropical"],
  "Caipirinha Clássica":["Clássicos","Churrasco","Descomplicado","Piscina","Refrescante"],"Caipirinha com Rapadura":["Introspectivo","Reconfortante","Inesperados","Churrasco"],"Caipirinha de Limão-Cravo":["Refrescante","A dois","Inesperados"],"Caipirinha de Três Limões":["Refrescante","Festa","Piscina"],"Caipirinha de Maracujá e Limão":["Refrescante","Piscina","Tropical"],"Caipirinha de Abacaxi Tostado":["Inesperados","Churrasco","Piscina"],"Caipirinha de Cambuci":["Inesperados","Introspectivo","Refrescante"],"Caipirinha de Limão-Siciliano e Capim-Santo":["Refrescante","A dois","Piscina"],"Caipirinha de Tangerina Verde e Salina":["Refrescante","Descomplicado","Piscina"],"Caipirinha de Caju e Mel":["Refrescante","Tropical","Churrasco"],"Caipirinha de Maracujá e Kaffir":["Inesperados","Complexo","A dois"],"Caipirinha de Uva Verde":["Introspectivo","Inesperados","A dois"],"Caipirinha de Caju Clássica":["Refrescante","Churrasco","Tropical"],"Caju com Limão-Cravo":["Refrescante","A dois","Inesperados"],"Caju, Salina e Pimenta-Rosa":["Inesperados","Complexo","Churrasco"],"Caju Tostado":["Introspectivo","Inesperados","Reconfortante"],"Caju e Louro":["Inesperados","Complexo","Introspectivo"],"Caju e Coco Seco":["Inesperados","Tropical","Piscina"],"Caju Vínico":["Complexo","Introspectivo","A dois","Inesperados"],"Caipirinha de Caju com Rum de Coco":["Tropical","Piscina","Festa","Inesperados"],
  "Caju & Oak":["Churrasco","Tropical","A dois","Reconfortante"],"Jardim de Caju":["A dois","Refrescante","Inesperados","Complexo"],"Caju Escuro":["Introspectivo","Tropical","A dois","Inesperados"],"Caju Bianco":["A dois","Introspectivo","Inesperados"],"Fumaça Tropical":["Introspectivo","Inesperados","Churrasco"],"Caju Spritz":["Refrescante","Piscina","Tropical","Festa"],"Caju Noturno":["Introspectivo","Inesperados","A dois"],"Caju Verde":["Refrescante","Churrasco","Inesperados"],
  "Maracujá Tônico":["Refrescante","Piscina","Descomplicado"],"Gold Passion":["Reconfortante","A dois","Tropical","Inesperados"],"Passo Solar":["Refrescante","Churrasco","Piscina"],"Maracujá Amargo":["Refrescante","Churrasco","Inesperados"],"Linha do Equador":["Tropical","Piscina","Inesperados"],"Pornstar Martini":["Festa","A dois","Tropical"],"Saturn":["Complexo","Tropical","Inesperados","Festa"],"Hurricane":["Festa","Tropical","Piscina"],"Cobra's Fang":["Complexo","Tropical","Inesperados"],"Passion Fruit Margarita":["Refrescante","Churrasco","Piscina","Tropical"],"Whiskey Sour de Maracujá":["A dois","Reconfortante","Tropical","Inesperados"],
  "Highball de Cajuína":["Refrescante","Descomplicado","Churrasco"],"Gin & Cajuína":["Refrescante","Piscina","Descomplicado"],"Rabo de Galo com Cajuína":["Introspectivo","A dois","Inesperados"],"Cajuína & Mezcal":["Introspectivo","Inesperados","Churrasco"],"Cajuína Old Fashioned":["Reconfortante","Introspectivo","Inesperados"],"Tequila & Cajuína":["Refrescante","Churrasco","Piscina"],
  "Batida de Coco":["Festa","Piscina","Tropical"],"Batida de Maracujá":["Festa","Piscina","Tropical"],"Cachaça Sour":["Refrescante","Churrasco"],"Quentão":["Reconfortante","Festa"],"Rabo de Galo":["Introspectivo","Clássicos"],"Leite de Onça":["Reconfortante","Festa"],"Caju Amigo":["Refrescante","Churrasco","Tropical"],"Macunaíma":["Introspectivo","Inesperados"],"Gabriela":["Inesperados"],"Cachaça Collins":["Refrescante","Piscina"],  "Old Fashioned de Cachaça":["Reconfortante","Clássicos"],"Caipirinha Envelhecida":["Introspectivo","Churrasco"],"Honey & Wood":["Reconfortante","Introspectivo"],"Julep Brasileiro":["Reconfortante","Introspectivo"],"Amaro Tropical":["Digestivo","Introspectivo"],"Madeira & Abacaxi":["Introspectivo","Inesperados","Tropical"],"Café com Cachaça":["Reconfortante","Digestivo"],"Orchard Brasileiro":["Introspectivo"],"Cachaça Manhattan":["Introspectivo"],"Spiced Cane":["Reconfortante","Inesperados"],"Rabo de Galo Envelhecido":["Introspectivo"],"Sazerac Brasileiro":["Introspectivo","Clássicos"],"Tropical Old Fashioned":["Introspectivo","Inesperados"],"Flor Rubra":["A dois","Refrescante"],"Highball de Amburana & Sal":["Introspectivo","Inesperados"],"Cachaça & Jerez":["Introspectivo","Inesperados"],
  "St‑Germain Hugo Spritz":["Refrescante","Piscina","Baixo álcool"],"St‑Germain Spritz":["Refrescante","Piscina","Baixo álcool"],"St-Germain Sour":["Refrescante","A dois"],"The Harvest":["Refrescante","A dois","Baixo álcool"],"Chá da Tarde":["Refrescante","Introspectivo"],"Vinho de Jardim":["Refrescante","A dois","Baixo álcool"],"Dourado Amargo":["Reconfortante"],"White Orchard Martini":["Introspectivo","A dois"],
  "Strega Sour":["Introspectivo","Inesperados"],"Strega Spritz":["Refrescante","Piscina","Baixo álcool"],"Italian Buck":["Refrescante"],"Strega Coffee Flip":["Digestivo","Inesperados"],"Strega Highball":["Descomplicado","Refrescante"],"Giardino Giallo":["Refrescante","Piscina"],"Zafferano Tonic":["Inesperados","Refrescante"],"Ervas & Casca":["Inesperados"],"Campo Noturno":["Digestivo","Introspectivo"],"Ouro & Fumaça":["Introspectivo","Inesperados"],"Freddo di Benevento":["Introspectivo","Descomplicado"],"Fruto Secreto":["Introspectivo"],"Golden Orchard":["Refrescante","Piscina"],"Noite em Benevento":["Digestivo","Reconfortante"],"Citrus Incantation":["Refrescante"],"Campo Alto":["Refrescante","Piscina"],"Tropical Esotérico":["Inesperados","Festa","Tropical"],"Strega & Tonic Verde":["Refrescante","Piscina"],"Golden Orange Fizz":["Refrescante","Descomplicado"],"Floral Witch":["Refrescante","Piscina"],"Bitter Sunshine":["Refrescante","Inesperados","Baixo álcool"],
  "Bamboo":["Introspectivo","Inesperados","Baixo álcool"],"Adonis":["Introspectivo","Inesperados","Baixo álcool"],"Sherry Cobbler":["Clássicos","Refrescante","Baixo álcool"],"Rebujito":["Refrescante","Festa","Baixo álcool"],"Tío Pepe & Tônica":["Refrescante","Descomplicado","Baixo álcool"],"Sherry Highball":["Refrescante","Descomplicado","Baixo álcool"],"Sherry Sour":["Introspectivo","Baixo álcool"],"East India Sour":["Digestivo","Inesperados"],"Sherry Old Fashioned":["Introspectivo","Inesperados"],"Coronation Cocktail":["Inesperados"],
  "Bosco Notturno":["Reconfortante","Introspectivo"],"Caramello Spritz":["Refrescante","Inesperados","Baixo álcool"],"Nero Fizz":["Inesperados"],"Sicilian Orchard":["Digestivo","Reconfortante"],"Amaro Tonic Café":["Inesperados","Refrescante"],"Dark Tropic":["Inesperados","Tropical"],
  "Jardim Noturno":["Inesperados","Introspectivo"],"Maçã Verde Elétrica":["Refrescante","Inesperados"],"Fennel Tonic":["Inesperados","Introspectivo"],"Solar Verde":["Refrescante","Inesperados"],"Vinha Fantasma":["Inesperados"],"Mate Verde":["Inesperados","Refrescante"],"Abacaxi Anisado":["Inesperados","Refrescante"],"Green Shandy":["Inesperados","Churrasco"],
  "Fernet & Coke":["Descomplicado","Churrasco"],"Fernet Sour":["Introspectivo"],"Fernet Ginger Highball":["Refrescante","Churrasco"],"Fernet Spritz":["Refrescante","Inesperados"],
  "Porto Tônico Tinto":["Refrescante","Piscina","Baixo álcool"],"Porto Flip":["Digestivo","Inesperados"],"Porto Negroni":["Introspectivo","Inesperados"],"Porto Branco & Tônica":["Refrescante","Piscina","Baixo álcool"],"Porto Branco Sour":["Refrescante","Baixo álcool"],"Porto Branco Spritz":["Refrescante","Piscina","Baixo álcool"],
  "Lillet Vive":["Refrescante","Piscina","Baixo álcool"],"Lillet Berry":["Refrescante","A dois","Baixo álcool"],"Lillet & Gin Highball":["Refrescante"],"Lillet Honey Lemon":["Refrescante"],"White Negroni Tropical":["Introspectivo","Inesperados"],"Lillet Garden Spritz":["Refrescante","Piscina","Baixo álcool"],"Cynar Sunset Highball":["Refrescante","Baixo álcool"],"French Aviation (hack)":["Refrescante","Introspectivo"],"Lillet Orchard":["Introspectivo","Baixo álcool"],"Almost Martini":["Introspectivo"],"Horta & Laranja Queimada":["Introspectivo","Inesperados"],"Lillet Gold Rush":["Reconfortante"],"Solar Highball":["Refrescante","Piscina","Baixo álcool"],"Lillet Spritz":["Refrescante","Piscina","Baixo álcool"],"Lillet & Tônica":["Refrescante","Descomplicado","Baixo álcool"],"Jasmine":["Inesperados","Introspectivo"],"Lillet Rosé Spritz":["Refrescante","A dois","Baixo álcool"],
  "Americano":["Clássicos","Refrescante","Baixo álcool"],"Cynar Tônica":["Refrescante","Descomplicado","Baixo álcool"],"Cynar Spritz":["Refrescante","Piscina","Baixo álcool"],"Cynar & Soda Salina":["Inesperados"],"Bitter Milk Punch":["Inesperados","Complexo"],"Vinho Fantasma":["Reconfortante","Inesperados"],"Rubor Picante":["Inesperados"],"Espresso Amaro Highball":["Inesperados"],"Casca & Fumaça":["Introspectivo","Inesperados"],"Campari Lemon Tonic":["Refrescante"],"Laranja & Sal":["Refrescante","Descomplicado"],"Highball Picante":["Refrescante","Inesperados"],"Uva Amarga":["Inesperados"],"Bitter Ginger Highball":["Refrescante","Churrasco"],"Verde & Amargo":["Refrescante","Inesperados"],"Tomate Highball":["Inesperados"],
  "Mimosa":["Clássicos","Festa","Baixo álcool"],"Bellini":["Clássicos","Festa","A dois","Baixo álcool"],"Rossini":["Festa","A dois","Baixo álcool"],"Tintoretto":["A dois","Baixo álcool"],"Puccini":["A dois","Baixo álcool"],"Kir Royale":["Clássicos","A dois","Baixo álcool"],"Champagne Cocktail":["Clássicos","A dois"],"Spritz de Toranja":["Refrescante","Piscina","Baixo álcool"],
  "Sangria":["Festa","Churrasco","Baixo álcool"],
  "Virgin Mojito":["Refrescante","Piscina"],"Shirley Temple":["Festa","Piscina"],"Arnold Palmer":["Refrescante","Piscina"],"Hibiscus Fizz":["Refrescante","Piscina"],"Cucumber Cooler":["Refrescante","Piscina"],"Água de Coco Spritz":["Refrescante","Piscina","Tropical"],"Virgin Margarita":["Refrescante","Piscina"],"Ginger Lemonade":["Refrescante","Piscina"],"Shrub de Frutas Vermelhas":["Refrescante","Inesperados"],
"Pimm's Cup":["Clássicos","Festa","Piscina"],"Grasshopper":["Digestivo","Inesperados"],"Golden Dream":["Digestivo"],"Cachanchara":["Inesperados"],"Bronx Cocktail":["Clássicos","Inesperados"],
};

const FAMILY_DESC = {
  "Sour":           "Equilíbrio clássico entre destilado, cítrico e adoçante. O frescor do limão encontra a doçura do xarope, criando drinks vibrantes e bem estruturados. Podem levar clara de ovo, que traz textura aveludada. É a base de famílias como Collins e Fizz — a principal diferença está no uso de gás e na textura final.",
  "Highball":       "Simplicidade que nunca sai de moda. Um destilado combinado com um mixer gelado — água tônica, refrigerante ou soda — servido num copo alto com bastante gelo. Direto e refrescante, com foco no equilíbrio e na diluição ao longo do tempo.",
  "Collins":        "Um Sour alongado com soda, servido num copo alto. Leve, cítrico e efervescente, perfeito para quem busca frescor com um pouco mais de volume.",
  "Sparkling":      "Drinks construídos diretamente sobre espumante, champagne ou prosecco — sem adição de soda. Estrutura simples: o espumante encontra um suco, purê ou licor e é servido em flute ou coupe, sem gelo. A carbonatação natural é protagonista. Mimosa, Bellini e Champagne Cocktail são os exemplos mais clássicos.",
  "Spritz":         "Drinks com vinho espumante ou prosecco como base, completados com um licor amargo ou aperitivo e uma splash de soda. Cor vibrante, amargor elegante e muitas bolhas. Servidos com bastante gelo em taça grande. Uma alternativa sofisticada aos Highballs para quem prefere algo mais aromático e menos alcoólico.",
  "Fizz":           "Compartilha o DNA do Sour e do Collins — destilado, cítrico e adoçante — mas é batido no shaker antes de receber a soda, criando uma textura mais leve, aerada e espumosa. Um clássico das tardes quentes.",
  "Sling":          "Destilado, adoçante, cítrico e água — uma das estruturas mais antigas da coquetelaria. Mais simples que um Sour e menos efervescente que um Collins, o Sling carrega uma elegância histórica que deu origem a muitos clássicos modernos.",
  "Buck":           "Espirituoso, suco de limão e ginger beer ou ginger ale. A picância do gengibre faz todo o trabalho aqui — diferente do Highball, que usa mixers neutros, o Buck tem personalidade própria e inconfundível. O Moscow Mule é o exemplo mais famoso da família.",
  "Beer Highballs": "Cerveja como mixer principal — combinada com destilados ou licores para drinks longos, refrescantes e com caráter.",
  "Smash":          "Ervas frescas e frutas amassadas diretamente no copo ou shaker, misturadas com destilado e gelo quebrado. Mais rústico e aromático que um Sour, mais cheio de frescor que um Built. O processo de macerar os ingredientes é o que define o caráter do drink.",
  "Hot":            "Para os dias frios ou momentos de aconchego. Drinks servidos quentes — com chá, café, leite ou água quente — que aquecem por dentro e encantam pelos aromas. Enquanto Shaken e Stirred trabalham o frio e a diluição, os Hot drinks jogam com o calor para liberar camadas de sabor.",
  "Frozen":         "Drinks preparados no liquidificador com gelo triturado, resultando em texturas cremosas a meio caminho entre bebida e sobremesa. Temperatura e proporção de gelo definem a consistência — cremoso é o acerto, aguado é o erro.",
  "Tiki":           "Coquetelaria tropical criada nos EUA dos anos 1930, inspirada no Pacífico Sul. Rums em camadas, frutas exóticas, xaropes especiados e apresentações exuberantes. Don Beach e Trader Vic são os fundadores do estilo — extravagante, complexo e sem desculpas.",
  "Blended":        "Drinks batidos no liquidificador — podem ser congelados ou não. A textura é o elemento principal: cremosa, aerada ou granulada. Abrangem desde daiquiris frozen até coladas e drinks com sorvete.",
  "Não alcóolicos": "Todo o sabor, zero álcool. Drinks elaborados com xaropes artesanais, sucos, ervas e água tônica — tão complexos e bem construídos quanto qualquer Sour, Spritz ou Collins da carta. A técnica é a mesma; o que muda é a base.",
  "Stirred":        "Mexidos delicadamente com gelo até atingir a temperatura e diluição ideais. Sem shaker, sem barulho — só textura sedosa e sabor concentrado. O oposto do Shaken: aqui a aeração não é bem-vinda, e os destilados falam por si mesmos.",
  "Shaken":         "Agitados vigorosamente no shaker para misturar, resfriar e aerar de uma vez. O oposto do Stirred: resultam em drinks mais frios, levemente diluídos e com textura viva. É a técnica certa para receitas com cítrico, clara de ovo ou sucos — como a maioria dos Sours e Fizzes.",
  "Built":          "Construídos diretamente no copo, ingrediente por ingrediente, sem transferências. Sem shaker, sem coador — ao contrário dos Stirred, nem ao menos saem do copo em que serão bebidos. Diretos e honestos, como um bom Negroni ou um Old Fashioned.",
  "Preparos Caseiros": "Os bastidores do bar: xaropes, tinturas, cordiais e infusões feitos em casa. Não são drinks prontos, mas são o que elevam uma receita comum e dão identidade a diversas famílias.",
};

const norm = s => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const capFirst = s => typeof s==="string"&&s.length ? s.charAt(0).toUpperCase()+s.slice(1) : s;
// chave de override de uma receita base: o nome original, mesmo após renomear
const ovKey = r => r._origName || r.name;

// separa "60 ml suco de limão" em { amount:"60 ml", name:"suco de limão" } para
// exibir com dot leaders; strings sem medida reconhecível rendem como texto puro
const MEASURE_RE = /^([\d½¼¾⅓⅔][\d.,/½¼¾⅓⅔]*\s*(?:ml|cl|l|oz|g|kg|dashe?s?|gotas?|colher(?:es)?(?:\s+de\s+(?:chá|sopa))?|col\.?\s*(?:de\s*)?(?:chá|sopa)|pitadas?|partes?|barspoons?|xícaras?|cm))(?:\s+de)?\s+(.+)$/i;
const splitMeasure = s => {
  const m = (s||"").match(MEASURE_RE);
  return m ? { amount:m[1].trim(), name:m[2] } : null;
};

// ─── SISTEMA TIPOGRÁFICO — Descobrir + Receita aberta ─────────────────────────
// Fonte única de verdade. Altere aqui e afeta toda a tela.
const CARD_TYPO = {
  // ── Tags do topo do card (família e base alcoólica — mesmo nível hierárquico) ──
  tag:         { fontSize:10, letterSpacing:2, textTransform:"uppercase", color:"rgba(231,224,205,0.48)", fontWeight:600, fontFamily:"Archivo,sans-serif", lineHeight:1, textShadow:"0 1px 4px rgba(0,0,0,0.9)" },
  // ── Eyebrow acima do nome no hero (família na receita aberta) ─────────────────
  heroEyebrow: { fontSize:8, letterSpacing:2.5, textTransform:"uppercase", fontWeight:600, fontFamily:"Archivo,sans-serif", lineHeight:1 },
  // ── Linha de flavors (Cítrico • Frutado • Herbal) — cor vem do tema ──────────
  flavor:      { fontSize:8.5, letterSpacing:2.5, textTransform:"uppercase", fontFamily:"Archivo,sans-serif", lineHeight:1, opacity:0.75 },
  // ── Assinatura: ícone (◈ ❋ ✦) — cor e glow vêm do tema ─────────────────────
  sigIcon:     { fontSize:12, lineHeight:1.2 },
  // ── Assinatura: rótulo (PERFIL / SENSAÇÃO / OCASIÃO) ──────────────────────────
  sigLabel:    { fontSize:7.5, letterSpacing:1.5, textTransform:"uppercase", color:"rgba(231,224,205,0.50)", fontWeight:600, fontFamily:"Archivo,sans-serif", lineHeight:1.6 },
  // ── Assinatura: valor (Elegante / Aveludado / Aperitivo) — fontSize por length ─
  sigValue:    { letterSpacing:0.5, textTransform:"uppercase", color:"rgba(231,224,205,0.82)", fontWeight:600, fontFamily:"Archivo,sans-serif", lineHeight:1.5, textAlign:"center" },
  // ── Cabeçalho de seção na receita (INGREDIENTES / MODO DE PREPARO) ────────────
  sectionHead: { fontSize:9, letterSpacing:2.5, textTransform:"uppercase", fontWeight:700, fontFamily:"Archivo,sans-serif", opacity:0.85 },
  // ── Corpo — ingredientes e passos ─────────────────────────────────────────────
  bodyText:    { fontSize:14, color:"rgba(231,224,205,0.70)", lineHeight:1.6, fontFamily:"Archivo,sans-serif" },
  // ── Notas (itálico, mais suave) ───────────────────────────────────────────────
  noteText:    { fontSize:13, color:"rgba(231,224,205,0.60)", lineHeight:1.7, fontFamily:"Archivo,sans-serif", fontStyle:"italic" },
  // ── Botões de ação da receita aberta (já provei, favorito, etc.) ──────────────
  actionBtn:   { fontSize:10, letterSpacing:0.8, textTransform:"uppercase", fontWeight:600, fontFamily:"Archivo,sans-serif" },
  // ── Labels de UI: abaixo dos botões circulares e filtros da barra inferior ─────
  uiLabel:     { fontSize:9, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, fontFamily:"Archivo,sans-serif" },
  // ── Contador de posição no swipe (1 / 24) ─────────────────────────────────────
  counter:     { fontSize:8, letterSpacing:2, textTransform:"uppercase", opacity:0.55, fontFamily:"Archivo,sans-serif" },
};

// ─── SISTEMA DE COPOS ─────────────────────────────────────────────────────────
const FAMILY_GLASS = {
  "Sour":"coupe","Shaken":"coupe",
  "Highball":"highball","Buck":"highball","Beer Highballs":"highball","Não alcóolicos":"highball",
  "Collins":"collins","Fizz":"collins","Sling":"collins",
  "Stirred":"rocks","Built":"rocks","Smash":"rocks",
  "Sparkling":"coupe","Spritz":"wine","Hot":"irish","Frozen":"collins","Tiki":"highball","Blended":"collins","_default":"rocks",
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
  {name:"Aperol Spritz",categories:["Aperol","Espumante","Spritz","Built"],ingredients:["150 ml prosecco","100 ml Aperol","50 ml água com gás","5 cubos gelo","1 rodela laranja"],steps:["Coloque os ingredientes em um copo largo","Obedeça à proporção 3:2:1 — prosecco, Aperol e água com gás"],notes:"",rating:0,servings:"",custom:false},
  {name:"Aviation",categories:["Gin","Luxardo Maraschino","Licor","Sour","Shaken"],ingredients:["45 ml gin","15 ml Luxardo Maraschino","15 ml suco de limão","(opcional) 5 ml creme de violeta"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe duplo em coupe gelada.","Decore com cereja marrasquino."],notes:"Floral e levemente ácido. O creme de violeta é opcional mas dá a cor roxa característica.",rating:0,servings:"",custom:false},
  {name:"Beirão & Maracujá",categories:["Collins","Licor Beirão","Built"],ingredients:["40 ml Licor Beirão","30 ml suco de maracujá","10 ml limão","soda"],steps:["Combine Beirão, maracujá e limão com gelo num copo alto.","Complete com soda gelada.","Mexa suavemente e decore."],notes:"Tropical e refrescante. O maracujá equilibra o amargor do Beirão.",rating:0,servings:"",custom:false},
  {name:"Beirão + Campari",categories:["Campari","Licor Beirão","Stirred"],ingredients:["30 ml Beirão","30 ml Campari","gelo","casca de laranja"],steps:["Adicione Beirão e Campari num copo com gelo.","Mexa suavemente.","Expresse a casca de laranja sobre o drink e decore."],notes:"Dois amargos que se completam. Intenso e sem açúcar.",rating:0,servings:"",custom:false},
  {name:"Beirão Lemon",categories:["Collins","Licor Beirão","Built"],ingredients:["50 ml Licor Beirão","20 ml limão","soda ou água com gás","gelo"],steps:["Combine Beirão e limão num copo com gelo.","Complete com soda gelada.","Mexa uma vez e sirva."],notes:"Simples e refrescante. A versão mais acessível do Beirão.",rating:0,servings:"",custom:false},
  {name:"Beirão Spritz",categories:["Espumante","Spritz","Licor Beirão","Built"],ingredients:["40 ml Licor Beirão","80 ml espumante","40 ml água com gás","casca de laranja"],steps:["Adicione gelo e Beirão numa taça de vinho.","Complete com espumante e água com gás.","Expresse a casca de laranja e decore."],notes:"O Aperol Spritz com personalidade portuguesa.",rating:0,servings:"",custom:false},
  {name:"Beirão, Mel & Alecrim",categories:["Licor Beirão","Sour","Shaken"],ingredients:["50 ml Licor Beirão","15 ml mel diluído 1:1","15 ml suco de limão","1 ramo pequeno de alecrim","gelo"],steps:["Bata todos os ingredientes com gelo por 10–12 segundos.","Faça dupla coagem para rocks com gelo fresco.","Bata levemente o alecrim na mão para liberar aroma e finalize."],notes:"Herbal, cítrico e quente ao mesmo tempo. O alecrim aproxima os aromas do Beirão das notas de mel e especiarias.",rating:0,servings:"1",custom:false},
  {name:"Bourbon, laranja e gengibre",categories:["Whisky","Triple Sec","Built"],ingredients:["60 ml bourbon","15 ml Triple Sec","15 ml xarope de gengibre","60 ml suco de laranja","gelo esmagado"],steps:["Combine tudo num copo alto com gelo esmagado.","Mexa suavemente e sirva.","Receita de Xarope de Gengibre disponível em Preparos Caseiros."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Bramble",categories:["Gin","Sour","Shaken"],ingredients:["45 ml gin","30 ml suco de limão siciliano","1 col. chá açúcar","20 ml licor de amora"],steps:["Bata o gin, limão e açúcar com gelo e coe num copo cheio de gelo.","Despeje o licor de amora por cima.","Decore com amora, limão e hortelã."],notes:"Servir em Double old-fashioned",rating:0,servings:"1",custom:false},
  {name:"Cantaloupe Martini sem álcool",categories:["Não alcóolicos","Shaken"],ingredients:["15 ml xarope de manjericão","120 ml suco de melão cantaloupe","10 ml suco de limão","pitada de sal marinho","gelo"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em taça coupe."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Citrus Martini",categories:["Vodka","Aperol","Sour","Shaken"],ingredients:["30 ml aperol","50 ml vodka","10 ml suco de limão","1 col. sopa açúcar"],steps:["Gele a taça. Combine tudo na coqueteleira com gelo. Bata bem e faça dupla coagem."],notes:"",rating:0,servings:"",custom:false},
  {name:"Coco e tônica",categories:["Não alcóolicos","Built"],ingredients:["100 ml água de coco","80 ml água tônica","15 ml suco de limão"],steps:["Coloque gelo em copo alto.","Adicione a água de coco e o suco de limão.","Complete com a tônica. Mexa delicadamente."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Cynar Ginger Spritz",categories:["Cynar","Spritz","Built"],ingredients:["40 ml Cynar","60 ml espumante brut","40 ml tônica de gengibre","Gelo","Casca de laranja"],steps:["Adicione gelo e Cynar numa taça.","Complete com tônica de gengibre e espumante.","Expresse a casca de laranja e decore."],notes:"Amargo, efervescente e refrescante. O gengibre potencializa o Cynar.",rating:0,servings:"",custom:false},
  {name:"Daiquiri Parisiense",categories:["Rum Branco","St‑Germain","Sour","Shaken"],ingredients:["40 ml rum branco","20 ml St-Germain","20 ml suco de limão","1 col. chá açúcar"],steps:["Dissolva o açúcar no limão.","Adicione rum e St-Germain com gelo.","Bata e coe em coupe gelada."],notes:"O St-Germain florifica o Daiquiri clássico. Mais elegante e menos direto.",rating:0,servings:"",custom:false},
  {name:"Dark 'n' Stormy",categories:["Rum Envelhecido","Highball","Buck","Built"],ingredients:["60 ml rum escuro","120 ml cerveja de gengibre","15 ml suco de limão"],steps:["Encha o copo com gelo.","Adicione o limão e a ginger beer.","Despeje o rum por cima — ele flutua criando a cor escura."],notes:"Marca registrada da Gosling's. O rum por cima é parte da apresentação.",rating:0,servings:"",custom:false},
  {name:"Garden Gin",categories:["Gin","Smash","Shaken"],ingredients:["60 ml gin","50 ml xarope de manjericão","30 ml suco de limão","60 ml suco de pepino","manjericão fresco para decorar"],steps:["Prepare o xarope: água + açúcar 1:1, fervente, desligue e infuse manjericão por 30 min.","Combine gin, xarope, limão e suco de pepino na coqueteleira com gelo.","Agite bem e coe. Decore com manjericão."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Dry Martini",categories:["Gin","Vermute seco","Stirred"],ingredients:["2½ partes Gin","½ parte Vermute seco","1 dash licor amargo de laranja","casca de limão"],steps:["Encher copo misturador com gelo.","Adicionar ingredientes e mexer.","Coar em taça gelada. Decorar com limão."],notes:"",rating:0,servings:"",custom:false},
  {name:"Elderflower Aviation",categories:["Gin","Luxardo Maraschino","St‑Germain","Sour","Shaken"],ingredients:["45 ml gin","10 ml St-Germain","10 ml Luxardo Maraschino","20 ml suco de limão"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente e coe duplo em coupe."],notes:"O St-Germain substitui parte do Maraschino — fica mais floral e menos doce que o Aviation clássico.",rating:0,servings:"",custom:false},
  {name:"Elderflower Daiquiri",categories:["Rum Branco","St‑Germain","Luxardo Maraschino","Sour","Shaken"],ingredients:["60 ml rum branco","15 ml St-Germain","5 ml Maraschino","20 ml suco de limão"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em coupe gelada."],notes:"Fresco, floral e com fundo elegante de amêndoa. Mais complexo que o Daiquiri clássico.",rating:0,servings:"",custom:false},
  {name:"Fermentação selvagem (Ginger Bug)",categories:["Ginger Bug","Preparos Caseiros"],ingredients:["8 cm gengibre fresco","2 xícaras açúcar branco","2 limões","Água sem cloro"],steps:["Adicione gengibre ralado e açúcar em 250 ml água.","Cubra e guarde em local escuro.","Alimente diariamente até borbulhar (2–7 dias)."],notes:"Fermentação selvagem",rating:0,servings:"4L",custom:false},
  {name:"Flor de Cerejeira Fizz",categories:["Fizz","Luxardo Maraschino","St‑Germain","Built"],ingredients:["20 ml Luxardo","20 ml St-Germain","10 ml suco de limão","água com gás para completar"],steps:["Combine Luxardo, St-Germain e limão com gelo.","Complete com água com gás gelada.","Decore com casca de limão ou flor comestível."],notes:"Floral, leve e muito perfumado. Baixo teor alcoólico.",rating:0,servings:"1",custom:false},
  {name:"Flor de Cerejeira Spritz",categories:["Espumante","Spritz","Luxardo Maraschino","St‑Germain","Built"],ingredients:["20 ml Luxardo","20 ml St-Germain","10 ml suco de limão","espumante brut para completar"],steps:["Combine Luxardo, St-Germain e limão com gelo.","Complete com espumante brut gelado.","Decore com casca de limão ou flor comestível."],notes:"Versão com espumante — mais estruturada e levemente seca. Floral e elegante.",rating:0,servings:"1",custom:false},
  {name:"French 75",categories:["Espumante","Fizz","Gin","Shaken"],ingredients:["30 ml gin","15 ml suco de limão","15 ml xarope simples","champagne para completar"],steps:["Combine gin, limão e xarope na coqueteleira com gelo.","Agite e coe em taça flute.","Complete com champagne.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Cítrico, seco e sofisticado. Prosecco funciona e resulta num perfil mais frutado — champagne traz mais mineralidade e acidez fina.",rating:0,servings:"1",custom:false},
  {name:"Garden Spritz",categories:["Espumante","Luxardo Maraschino","Spritz","St‑Germain","Built"],ingredients:["25 ml St-Germain","10 ml Maraschino","80 ml prosecco","splash de soda"],steps:["Adicione gelo numa taça de vinho.","Coloque St-Germain e Maraschino.","Complete com prosecco e um splash de soda."],notes:"Leve, perfumado e delicado. Perfeito para aperitivo.",rating:0,servings:"",custom:false},
  {name:"Gin Fizz",categories:["Gin","Fizz","Shaken"],ingredients:["60 ml Gin","30 ml suco de lima","22 ml xarope simples","Água com gás","1 fatia limão"],steps:["Agite gin, limão e xarope com gelo.","Coe em copo alto.","Complete com água com gás.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Gin Tônica",categories:["Gin","Highball","Built"],ingredients:["50 ml Gin","150 ml Tônica","fatia de limão"],steps:["Encha taça balão com gelo.","Adicione o gin.","Complete com tônica pela lateral. Mexa uma vez."],notes:"",rating:0,servings:"",custom:false},
  {name:"Gin Tônica de Bergamota",categories:["Gin","Highball","Built"],ingredients:["50 ml Gin","150 ml Tônica","4 gomos de bergamota","2 gotas Angostura"],steps:["Esprema os gomos de bergamota no fundo da taça balão.","Encha com gelo. Adicione o gin.","Complete com tônica pela lateral. Pingue o Angostura."],notes:"Cítrico, levemente floral e com fundo amargo. Variação elegante do G&T clássico.",rating:0,servings:"",custom:false},
  {name:"Ginger beer (caseira)",categories:["Ginger Beer","Preparos Caseiros"],ingredients:["100g gengibre","200g açúcar","1 limão","1,5L água","6g fermento"],steps:["Ferva a água com gengibre e limão fatiados. Adicione açúcar e cozinhe 15 min.","Coe e transfira para balde fermentador com o fermento dissolvido.","Após 4 dias, transfira com 8g açúcar/litro. Aguarde 2 semanas."],notes:"",rating:0,servings:"",custom:false},
  {name:"Grenadine Ginger Margarita",categories:["Tequila","Triple Sec","Sour","Shaken"],ingredients:["60 ml tequila","30 ml suco de limão","15 ml Cointreau","15 ml grenadine","60 ml ginger beer"],steps:["Combine tequila, limão, Cointreau e grenadine na coqueteleira com gelo.","Agite por 10s e coe em copo de margarita ou rocks com gelo.","Complete com ginger beer e sirva.","Receitas de Grenadine Caseira e Ginger beer (caseira) disponíveis em Preparos Caseiros."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Hemingway Daiquiri Cordial",categories:["Rum Branco","Luxardo Maraschino","Sour","Shaken"],ingredients:["60 ml rum branco","10 ml Luxardo Maraschino","20 ml suco de limão","10–15 ml cordial de toranja (no lugar do suco)"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 15s.","Coe em taça de coquetel gelada.","Receita de Cordial de Toranja disponível em Preparos Caseiros."],notes:"Variação com cordial de toranja no lugar do suco — mais concentrado e com os óleos da casca. Luxardo reduzido para 10 ml para preservar o caráter seco. Quer mais seco: reduza mais o Luxardo. Quer mais cítrico: aumente o limão, não o cordial.",rating:0,servings:"1",custom:false},
  {name:"Hemingway Daiquiri",categories:["Rum Branco","Luxardo Maraschino","Sour","Shaken"],ingredients:["60 ml rum branco","15 ml Luxardo Maraschino","20 ml suco de limão","15 ml suco de grapefruit"],steps:["Agite rum, Maraschino, limão e grapefruit com gelo por 15s.","Coe em taça de coquetel gelada."],notes:"Criado para Ernest Hemingway, que preferia drinks menos doces. Seco, cítrico e com fundo floral.",rating:0,servings:"",custom:false},
  {name:"Highball de Luxardo",categories:["Highball","Luxardo Maraschino","Built"],ingredients:["30 ml Luxardo","10 ml limão Tahiti","água com gás para completar","gelo"],steps:["Esprema o limão no copo. Encha com gelo.","Adicione o Luxardo.","Complete com água com gás. Mexa suavemente."],notes:"Super leve, quase um refrigerante adulto. Perfeito pra calor.",rating:0,servings:"",custom:false},
  {name:"Jamaica Rouge",categories:["Rum Envelhecido","Shaken"],ingredients:["2 partes rum escuro da Jamaica","1 parte groselha","3 dashes Curaçao de laranja","1 dash bitter"],steps:["Agite com gelo e coe em taça de coquetel."],notes:"",rating:0,servings:"",custom:false},
  {name:"Jasmine (Casa do Porco)",categories:["Gin","Campari","Triple Sec","Sour","Shaken"],ingredients:["45 ml Gin","15 ml Campari","15 ml Cointreau","20 ml suco de limão"],steps:["Agite todos os ingredientes com gelo por 15s.","Coe em taça de coquetel gelada.","Decore com casca de limão."],notes:"Cítrico, amargo e seco. Um sour sofisticado com alma italiana.",rating:0,servings:"1",custom:false},
  {name:"Jus dinger",categories:["Não alcóolicos","Highball","Built"],ingredients:["500g gengibre","3 polpas maracujá","2 polpas seriguela","2 polpas cajá","Açúcar orgânico","1 ramo hortelã","⅓ noz-moscada","flor de laranjeira"],steps:["Bata o gengibre com água e peneire.","Misture com as polpas e açúcar.","Adicione noz-moscada e flor de laranjeira."],notes:"",rating:0,servings:"6",custom:false},
  {name:"Lavender Gin Sour",categories:["Gin","Sour","Shaken"],ingredients:["50 ml Gin","20 ml xarope de lavanda","25 ml suco de limão","7,5 ml creme de leite fresco","7,5 ml xarope de violeta","1 clara de ovo"],steps:["Dry shake por 15s.","Adicione gelo e agite por mais 15s.","Coe em taça coupe.","Receita de Xarope de Lavanda disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Licor Beirão Sour",categories:["Licor Beirão","Sour","Shaken"],ingredients:["50 ml Licor Beirão","25 ml limão","15 ml açúcar","clara de ovo"],steps:["Dry shake todos os ingredientes por 10s sem gelo.","Adicione gelo e agite com força por mais 15s.","Coe em taça coupe. Decore com raspa de limão."],notes:"Herbal, cítrico e com textura aveludada. O mais elegante dos sours portugueses.",rating:0,servings:"",custom:false},
  {name:"Manhattan",categories:["Whisky","Vermute Rosso","Luxardo Maraschino","Stirred"],ingredients:["60 ml whisky de centeio","30 ml vermute tinto doce","2 dashes bitter","cereja para decorar"],steps:["Mexa com gelo em copo misturador.","Coe em taça de coquetel.","Decore com cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Manhattan (Perfect)",categories:["Whisky","Vermute Bianco","Vermute seco","Stirred"],ingredients:["60 ml whisky de centeio","15 ml vermute seco","15 ml vermute doce","2 dashes bitter","cereja e limão para decorar"],steps:["Mexa com gelo. Coe em taça. Decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Highball de Luxardo com Whisky",categories:["Whisky","Luxardo Maraschino","Highball","Built"],ingredients:["40 ml whisky","7 ml Luxardo Maraschino","5 ml suco de limão siciliano","água com gás bem gelada","casca de laranja"],steps:["Copo alto com bastante gelo.","Adicione whisky, Luxardo e limão.","Complete com água com gás.","Mexa suavemente.","Expresse a casca de laranja por cima e jogue dentro."],notes:"O Luxardo entra como cereja sofisticada — quase um eco de amêndoa. A água com gás transforma isso em algo bebível por horas.",rating:0,servings:"1",custom:false},
  {name:"Improved Whiskey Cocktail",categories:["Whisky","Luxardo Maraschino","Stirred"],ingredients:["50 ml whisky (bourbon ou centeio)","5 ml Luxardo Maraschino","5 ml xarope simples","2 dashes Angostura","twist de limão"],steps:["Misture whisky, Luxardo, xarope e Angostura com gelo.","Mexa bem e coe em rocks com gelo.","Expresse o twist de limão e coloque no copo.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"É tipo um Old Fashioned que decidiu usar um perfume italiano.",rating:0,servings:"1",custom:false},
  {name:"Maraschino Spritz",categories:["Espumante","Luxardo Maraschino","Spritz","Built"],ingredients:["40 ml Luxardo Maraschino","80 ml espumante brut","40 ml água com gás","rodela de laranja ou limão"],steps:["Encha taça com gelo.","Adicione o Luxardo.","Complete com espumante e água com gás. Mexa. Decore com rodela de laranja."],notes:"Leve, levemente doce e com fundo elegante de amêndoa. Um aperitivo sofisticado.",rating:0,servings:"",custom:false},
  {name:"Margarita",categories:["Tequila","Triple Sec","Sour","Shaken"],ingredients:["50 ml Tequila","25 ml suco de limão","25 ml Triple Sec","sal na borda (opcional)"],steps:["Agite tudo com gelo.","Coe em taça com borda de sal."],notes:"",rating:0,servings:"",custom:false},
  {name:"Martinez",categories:["Gin","Luxardo Maraschino","Vermute Rosso","Stirred"],ingredients:["45 ml gin","45 ml Vermute rosso","5 ml Luxardo Maraschino","2 dashes Angostura"],steps:["Mexa com gelo e coe."],notes:"O ancestral direto do Martini.",rating:0,servings:"",custom:false},
  {name:"Mojito",categories:["Rum Branco","Smash","Built"],ingredients:["40 ml rum","30 ml suco de limão","2 col. sobremesa açúcar","10 folhas hortelã","água com gás","Gelo"],steps:["Macere hortelã, açúcar e limão no copo.","Adicione gelo e rum.","Complete com água gaseificada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mojito Amendoado",categories:["Rum Branco","Smash","Built"],ingredients:["50 ml rum branco","10 folhas hortelã","20 ml limão taiti","20 ml xarope de amêndoa","Tônica de gengibre Britvic"],steps:["Bata tudo exceto a tônica.","Adicione a tônica ao final."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mojito de framboesa",categories:["Rum Branco","Smash","Built"],ingredients:["½ limão","5-6 framboesas","10-12 folhas hortelã","1 col. açúcar","60 ml rum claro","club soda"],steps:["Macere limão, framboesa, hortelã e açúcar.","Adicione gelo e rum. Complete com soda."],notes:"",rating:0,servings:"",custom:false},
  {name:"Moscow Mule",categories:["Vodka","Highball","Buck","Built"],ingredients:["60 ml Vodka","20 ml suco de limão","90 ml cerveja de gengibre","1 rodela limão"],steps:["Encha o caneco com gelo.","Adicione vodka e limão.","Complete com ginger beer. Decore."],notes:"Copo de cobre",rating:0,servings:"",custom:false},
  {name:"Mr. Grinch",categories:["Tequila","Sour","Shaken"],ingredients:["60 ml tequila ou mezcal","30 ml suco de pepino","15 ml xarope de jalapeño","10 ml suco de limão"],steps:["Bata tudo com gelo. Sirva com hortelã."],notes:"",rating:0,servings:"",custom:false},
  {name:"Negroni",categories:["Gin","Campari","Vermute Rosso","Stirred"],ingredients:["30 ml Gin","30 ml Campari","30 ml Vermute tinto"],steps:["Adicione gelo no copo.","Adicione os três ingredientes em partes iguais.","Mexa e decore com casca de laranja."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Negroni Sbagliato",categories:["Campari","Espumante","Spritz","Vermute Rosso","Built"],ingredients:["30 ml Campari","30 ml Vermute rosso","prosecco para completar"],steps:["Encha copo rocks com gelo.","Adicione Campari e Vermute rosso.","Complete com prosecco pela lateral. Mexa levemente.","Decore com casca de laranja."],notes:"Amargo, herbáceo e mais leve que o Negroni tradicional. As borbulhas suavizam o amargor.",rating:0,servings:"",custom:false},
  {name:"Old Fashioned",categories:["Whisky","Stirred"],ingredients:["60 ml Bourbon","2 dashes Bitter","1 cubo açúcar","casca de laranja"],steps:["Macere açúcar e bitter no copo.","Adicione gelo e bourbon.","Mexa e decore com laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Pisco Elderflower Sour",categories:["Pisco","St‑Germain","Sour","Shaken"],ingredients:["50 ml pisco","20 ml St-Germain","20 ml limão","clara de ovo","angostura"],steps:["Dry shake pisco, St-Germain, limão e clara sem gelo por 10s.","Adicione gelo e agite por mais 15s.","Coe em taça coupe. Pingue angostura na espuma."],notes:"Floral, cítrico e suave. O pisco com sabugueiro forma uma combinação delicada e elegante.",rating:0,servings:"",custom:false},
  {name:"Pisco Sour",categories:["Pisco","Sour","Shaken"],ingredients:["45 ml pisco","30 ml suco limão Taiti","20 ml xarope de açúcar","1 clara","Gelo","Bitter Angostura"],steps:["Agite tudo por 30-45s.","Coe e pingue 1-2 gotas de bitter."],notes:"",rating:0,servings:"",custom:false},
  {name:"Andes Highball",categories:["Pisco","Highball","Built"],ingredients:["50 ml pisco","20 ml cordial de erva-doce ou anis","10 ml suco de limão tahiti","água com gás","gelo"],steps:["Encha copo alto com gelo.","Adicione tudo.","Complete com água com gás e mexa suave."],notes:"O pisco já conversa com anis naturalmente.",rating:0,servings:"",custom:false},
  {name:"Uva & Sal",categories:["Pisco","Stirred"],ingredients:["60 ml pisco","25 ml suco de uva integral","5 ml solução salina (ou pitada de sal)","gelo"],steps:["Mexa tudo em copo baixo com gelo."],notes:"Seco, levemente frutado, com aquele snap salino que faz o pisco brilhar.",rating:0,servings:"",custom:false},
  {name:"Flor de Pedra",categories:["Pisco","St‑Germain","Shaken"],ingredients:["50 ml pisco","30 ml chá de jasmim frio","10 ml licor de flor (tipo St-Germain)","5 ml mel ou xarope leve"],steps:["Bata leve com gelo e coe."],notes:"Floral elegante, sem virar perfume. O pisco segura a estrutura.",rating:0,servings:"",custom:false},
  {name:"Campo Seco",categories:["Pisco","Cynar","Stirred"],ingredients:["50 ml pisco","20 ml amaro (tipo Averna ou Cynar)","10 ml vermouth seco","1 dash bitters aromático"],steps:["Mexa com gelo.","Sirva em copo baixo."],notes:"Não é um Negroni disfarçado. Aqui o pisco traz leveza onde normalmente teria peso.",rating:0,servings:"",custom:false},
  {name:"Pisco & Coco Tostado",categories:["Pisco","Shaken"],ingredients:["50 ml pisco","25 ml leite de coco","10 ml xarope de açúcar","2 gotas de óleo de gergelim tostado (opcional)","gelo"],steps:["Shake forte e sirva."],notes:"Cremoso, com final seco e levemente tostado.",rating:0,servings:"",custom:false},
  {name:"Verde Urbano",categories:["Pisco","Highball","Built"],ingredients:["50 ml pisco","15 ml suco de limão siciliano","10 ml xarope simples","folhas de manjericão","água tônica"],steps:["Macere levemente o manjericão.","Adicione pisco, limão e xarope.","Complete com tônica.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Herbal, fresco, meio coquetel de jardim depois da chuva.",rating:0,servings:"",custom:false},
  {name:"Noite em Lima",categories:["Pisco","Stirred"],ingredients:["50 ml pisco","20 ml café cold brew","10 ml licor de cacau","5 ml xarope de açúcar"],steps:["Mexa com gelo.","Sirva em copo baixo."],notes:"Café + uva é uma combinação subestimada.",rating:0,servings:"",custom:false},
  {name:"Pisco com Cerveja Branca",categories:["Pisco","Built"],ingredients:["40 ml pisco","80-100 ml cerveja witbier","10 ml suco de laranja","gelo"],steps:["Monte direto no copo."],notes:"Cítrico, levemente especiado, super bebível.",rating:0,servings:"",custom:false},
  {name:"Seco de Maçã",categories:["Pisco","Shaken"],ingredients:["50 ml pisco","30 ml suco de maçã clarificado","5 ml vinagre de maçã","gelo"],steps:["Mexa ou bata leve.","Sirva em copo baixo ou coupe."],notes:"Ácido, seco, muito gastronômico.",rating:0,servings:"",custom:false},
  {name:"Pisco Terroso",categories:["Pisco","Shaken"],ingredients:["50 ml pisco","20 ml suco de cenoura","10 ml suco de limão","5 ml mel","pitada de gengibre"],steps:["Shake e sirva."],notes:"Vegetal, fresco e surpreendentemente elegante.",rating:0,servings:"",custom:false},
  {name:"Sazerac",categories:["Conhaque","Stirred"],ingredients:["60 ml Conhaque","5 ml xarope simples","3 dashes Absinto","2 dashes Peychaud's bitters","casca de limão"],steps:["Passe o absinto no copo e descarte o excesso.","Adicione conhaque, xarope e bitters com gelo. Mexa.","Coe no copo preparado. Decore com limão.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"SAZERAC por Kennedy Nascimento",categories:["Conhaque","Whisky","Stirred"],ingredients:["30 ml cognac VSOP","30 ml bourbon ou centeio","1 torrão açúcar","Spray de Absinto","4 dashes Peychaud's","2 dashes angostura","Zest limão siciliano"],steps:["Suje o copo com absinto e reserve com gelo.","Macere açúcar com bitters no mixing glass. Adicione cognac e mexa.","Retire o gelo, verta o drink. Decore com zest."],notes:"",rating:0,servings:"",custom:false},
  {name:"Sevilla Sour",categories:["Gin","St‑Germain","Sour","Shaken"],ingredients:["50 ml gin Flor de Sevilla","20 ml St-Germain","25 ml limão siciliano","10 ml xarope simples","clara de ovo (opcional)"],steps:["Dry shake todos os ingredientes por 10s sem gelo.","Adicione gelo e agite por mais 15s.","Coe em taça coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Cítrico, floral e levemente amargo. O gin Flor de Sevilla traz laranja e complexidade naturais.",rating:0,servings:"",custom:false},
  {name:"Shanksjillo",categories:["Whisky","Triple Sec","Shaken"],ingredients:["30 ml Shanky's","30 ml Cointreau","30 ml espresso"],steps:["Prepare o espresso e deixe esfriar brevemente.","Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 15s até espumar.","Coe duplo em taça de coquetel gelada."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Smoked Apple Whiskey Tonic",categories:["Whisky","Highball","Built"],ingredients:["60 ml Apple Whiskey (Jack Daniel's)","120 ml ginger ale ou ginger beer","canela em pau","ramo de alecrim"],steps:["Defume o copo com canela por 1–2 min.","Adicione gelo e o whiskey.","Complete com ginger ale ou ginger beer.","Decore com alecrim.","Receita de Ginger beer (caseira) disponível em Preparos Caseiros."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Smokey Martini",categories:["Gin","Stirred"],ingredients:["60 ml Gin","toque de whisky defumado","raspa de limão"],steps:["Mexa gin e whisky defumado com gelo em copo misturador por 30s.","Coe em taça de coquetel gelada.","Expresse a raspa de limão sobre a taça e descarte."],notes:"Seco, aromático e com fundo esfumaçado. Um Martini com personalidade.",rating:0,servings:"",custom:false},
  {name:"Spring Martini",categories:["Gin","Luxardo Maraschino","St‑Germain","Stirred"],ingredients:["60 ml gin","10 ml St-Germain","5 ml Maraschino"],steps:["Mexa gin, St-Germain e Maraschino com gelo em copo misturador por 30s.","Coe em taça de coquetel gelada.","Decore com casca de limão siciliano."],notes:"Seco com notas florais de sabugueiro e amêndoa. Um Martini de primavera.",rating:0,servings:"",custom:false},
  {name:"St‑Germain Hugo Spritz",categories:["St‑Germain","Spritz","Espumante","Built"],ingredients:["40 ml St‑Germain","60 ml espumante","60 ml água com gás","8-10 folhas hortelã","1 fatia limão taiti"],steps:["Adicione as folhas de hortelã ao copo e cubra com gelo.","Adicione o St-Germain.","Complete com espumante e água com gás. Mexa suavemente.","Decore com fatia de limão."],notes:"Floral, refrescante e levemente herbáceo. O aperitivo italiano feito para dias quentes.",rating:0,servings:"",custom:false},
  {name:"St‑Germain Spritz",categories:["St‑Germain","Spritz","Espumante","Built"],ingredients:["40 ml St‑Germain","60 ml espumante brut","60 ml água com gás","casca limão siciliano"],steps:["Encha taça com gelo.","Adicione o St-Germain.","Complete com espumante e água com gás. Mexa.","Decore com casca de limão siciliano."],notes:"Elegante e floral, com borbulhas finas. Aperitivo leve e aromático.",rating:0,servings:"",custom:false},
  {name:"The Clover Club",categories:["Gin","Sour","Shaken"],ingredients:["45 ml Gin","20 ml suco de limão","15 ml xarope simples","4 framboesas","1 clara de ovo"],steps:["Agite tudo sem gelo por 15s.","Adicione gelo e agite por mais 15s.","Coe sem gelo.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Tom Gatsby",categories:["Gin","Collins","Vermute Bianco","Built"],ingredients:["45 ml gin","15 ml Vermute branco","20 ml suco de limão","5 ml xarope simples (opcional)","2 dashes Angostura","1 fatia de pepino (opcional)","soda para completar"],steps:["Combine gin, Vermute branco, limão e xarope com gelo.","Complete com soda.","Adicione Angostura e decore com pepino.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Uma versão dos anos 20 do Collins — o Vermute branco no lugar do açúcar puro dá mais profundidade e menos doce.",rating:0,servings:"1",custom:false},
  {name:"Whiskey Mule de Romã",categories:["Whisky","Highball","Buck","Built"],ingredients:["60 ml whiskey","15 ml suco de limão","15 ml grenadine de romã","3 gotas bitter de laranja","cerveja de gengibre"],steps:["Misture tudo e complete com ginger beer.","Receita de Grenadine Caseira disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Whiskey Sour",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml whisky","30 ml suco de lima","22 ml xarope simples","1 clara de ovo","alecrim tostado"],steps:["Agite com gelo. Coe em rocks cheio de gelo.","Decore com cereja.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"White Russian de abóbora",categories:["Vodka","Licor","Built"],ingredients:["45 ml vodka","30 ml Kahlúa","30 ml creme de leite batido com geleia de abóbora"],steps:["Coloque gelo num copo rocks.","Despeje a vodka e o Kahlúa sobre o gelo.","Bata levemente o creme com a geleia de abóbora e despeje por cima, deixando flutuante."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Daiquiri",categories:["Rum Branco","Sour","Shaken"],ingredients:["60 ml rum branco","30 ml suco de limão fresco","22 ml xarope simples"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 15s.","Coe em taça coupe gelada.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Simples e brilhante. A qualidade do rum faz toda a diferença.",rating:0,servings:"1",custom:false},
  {name:"Cosmopolitan",categories:["Vodka","Triple Sec","Sour","Shaken"],ingredients:["45 ml vodka","15 ml Cointreau","30 ml suco de cranberry","15 ml suco de limão"],steps:["Combine tudo com gelo.","Agite e coe em taça. Decore com casca de laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Gimlet",categories:["Gin","Sour","Shaken"],ingredients:["60 ml gin","20 ml cordial de limão","10 ml suco de limão fresco"],steps:["Combine na coqueteleira com gelo.","Agite e coe em taça coupe.","Receita de Cordial de Limão disponível em Preparos Caseiros."],notes:"Com cordial Rose's fica mais doce. Com suco fresco fica mais vivo.",rating:0,servings:"",custom:false},
  {name:"Americano",categories:["Campari","Vermute Rosso","Highball","Built"],ingredients:["30 ml Campari","30 ml vermute tinto doce","Água com gás","Casca de laranja"],steps:["Adicione Campari e vermute num copo com gelo.","Complete com água com gás.","Decore com casca de laranja."],notes:"O avô do Negroni. Mais leve e acessível.",rating:0,servings:"",custom:false},
  {name:"Boulevardier",categories:["Whisky","Campari","Vermute Rosso","Stirred"],ingredients:["45 ml bourbon","30 ml Campari","30 ml vermute tinto doce"],steps:["Mexa tudo com gelo por 30s.","Coe em taça ou rocks. Decore com laranja."],notes:"O Negroni com bourbon. Mais encorpado e quente.",rating:0,servings:"",custom:false},
  {name:"Rob Roy",categories:["Whisky","Vermute Rosso","Stirred"],ingredients:["60 ml Scotch whisky","30 ml vermute tinto doce","2 dashes Angostura","cereja marrasquino"],steps:["Mexa com gelo e coe em taça. Decore com cereja."],notes:"Manhattan escocês.",rating:0,servings:"",custom:false},
  {name:"Vieux Carré",categories:["Conhaque","Whisky","Vermute Rosso","Stirred"],ingredients:["22 ml cognac","22 ml whisky de centeio","22 ml vermute tinto doce","1 dash Angostura","1 dash Peychaud's","5 ml Bénédictine"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo. Decore com laranja."],notes:"Um clássico de Nova Orleans. Complexo e equilibrado.",rating:0,servings:"",custom:false},
  {name:"Amaretto Sour",categories:["Amaretto","Sour","Shaken"],ingredients:["60 ml Amaretto","30 ml suco de limão","20 ml bourbon","1 clara de ovo","2 dashes Angostura"],steps:["Dry shake por 15s.","Adicione gelo e agite por mais 15s.","Coe em rocks. Decore com cereja e laranja."],notes:"O bourbon equilibra o doce do Amaretto.",rating:0,servings:"",custom:false},
  {name:"New York Sour",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml bourbon ou centeio","30 ml suco de limão","22 ml xarope simples","1 clara de ovo","float de vinho tinto seco"],steps:["Dry shake tudo exceto o vinho.","Adicione gelo e agite. Coe em rocks.","Despeje o vinho tinto sobre o dorso de uma colher para criar o float.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O float de vinho cria uma camada visual impressionante.",rating:0,servings:"",custom:false},
  {name:"Espresso Martini",categories:["Vodka","Licor","Shaken"],ingredients:["50 ml vodka","30 ml licor de café (Kahlúa)","30 ml espresso fresco","5 ml xarope simples"],steps:["Prepare o espresso e deixe esfriar brevemente.","Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 15s — o shake forte cria a espuma.","Coe em taça coupe gelada. Decore com 3 grãos de café.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O espresso fresco (não frio) faz toda a diferença na espuma.",rating:0,servings:"1",custom:false},
  {name:"Sidecar",categories:["Conhaque","Triple Sec","Sour","Shaken"],ingredients:["50 ml conhaque","25 ml Cointreau","25 ml suco de limão siciliano","açúcar na borda (opcional)"],steps:["Prepare a borda da taça com açúcar.","Combine tudo com gelo e agite.","Coe em taça coupe."],notes:"Proporção clásica 2:1:1. Com mais limão fica mais seco.",rating:0,servings:"1",custom:false},
  {name:"Bee's Knees",categories:["Gin","Sour","Shaken"],ingredients:["60 ml gin","25 ml suco de limão","22 ml xarope de mel"],steps:["Combine tudo com gelo e agite bem.","Coe em taça coupe gelada.","Decore com casca de limão.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"O xarope de mel: dissolva mel em água quente na proporção 1:1.",rating:0,servings:"1",custom:false},
  {name:"Last Word",categories:["Gin","Luxardo Maraschino","Licor","Sour","Shaken"],ingredients:["22 ml gin","22 ml Green Chartreuse","22 ml Luxardo Maraschino","22 ml suco de limão"],steps:["Combine em partes iguais com gelo.","Agite e coe em taça coupe."],notes:"Partes iguais. Um dos drinks mais equilibrados da história.",rating:0,servings:"1",custom:false},
  {name:"Penicillin",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml scotch whisky","22 ml suco de limão","20 ml mel","gengibre fresco, 3 fatias","7 ml whisky defumado Islay (float)"],steps:["Macere levemente o gengibre com o mel na coqueteleira.","Adicione o scotch, o limão e gelo.","Agite bem e faça dupla coagem para um copo baixo com gelo fresco.","Finalize com o whisky defumado por cima."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Gold Rush",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml bourbon","22 ml suco de limão","22 ml xarope de mel"],steps:["Combine tudo com gelo e agite.","Coe em rocks com gelo grande.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"Primo do Bee's Knees. O mel suaviza o bourbon perfeitamente.",rating:0,servings:"1",custom:false},
  {name:"Cuba Libre",categories:["Rum Branco","Highball","Built"],ingredients:["50 ml rum branco ou dourado","150 ml cola","15 ml suco de limão","fatia de limão"],steps:["Encha o copo com gelo.","Adicione o rum e o limão.","Complete com cola pela lateral. Mexa uma vez. Decore."],notes:"A diferença para o rum com cola é o limão — não pule.",rating:0,servings:"1",custom:false},
  {name:"Paper Plane",categories:["Whisky","Aperol","Sour","Shaken"],ingredients:["22 ml bourbon","22 ml Aperol","22 ml Amaro Nonino","22 ml suco de limão"],steps:["Combine em partes iguais com gelo.","Agite e coe em taça coupe."],notes:"Partes iguais. Moderno clássico de Sam Ross (2008).",rating:0,servings:"1",custom:false},
  {name:"Singapore Sling",categories:["Gin","Triple Sec","Sling","Shaken"],ingredients:["45 ml gin","15 ml Cherry Heering","7 ml Cointreau","7 ml Bénédictine","120 ml suco de abacaxi","15 ml suco de limão","10 ml grenadine","1 dash Angostura"],steps:["Combine tudo com gelo e agite.","Coe em copo Collins com gelo.","Decore com cereja e fatia de abacaxi.","Receita de Grenadine Caseira disponível em Preparos Caseiros."],notes:"Criado no Raffles Hotel, Singapura, c. 1915.",rating:0,servings:"1",custom:false},
  {name:"Mimosa",categories:["Espumante","Sparkling","Built"],ingredients:["100 ml espumante brut gelado","50 ml suco de laranja fresco coado"],steps:["Despeje o suco na flute.","Complete com espumante gelado. Não mexa demais."],notes:"O suco de laranja fresco é essencial.",rating:0,servings:"1",custom:false},
  {name:"Bellini",categories:["Espumante","Sparkling","Built"],ingredients:["100 ml prosecco gelado","50 ml purê de pêssego branco fresco"],steps:["Coloque o purê na flute.","Complete com prosecco gelado devagar. Mexa suavemente."],notes:"Original do Harry's Bar, Veneza. Com pêssego branco fica mais elegante.",rating:0,servings:"1",custom:false},
  {name:"Rossini",categories:["Espumante","Sparkling","Built"],ingredients:["100 ml prosecco gelado","50 ml purê de morango fresco"],steps:["Coloque o purê na flute.","Complete com prosecco gelado devagar. Mexa suavemente."],notes:"Se o morango estiver ácido, ajuste com 5–10 ml de xarope simples.",rating:0,servings:"1",custom:false},
  {name:"Tintoretto",categories:["Espumante","Sparkling","Built"],ingredients:["100 ml prosecco gelado","50 ml suco de romã"],steps:["Despeje o suco de romã na flute.","Complete com prosecco. Mexa levemente."],notes:"Mais elegante e levemente tânico. A romã traz cor intensa.",rating:0,servings:"1",custom:false},
  {name:"Puccini",categories:["Espumante","Sparkling","Built"],ingredients:["100 ml prosecco gelado","50 ml suco de tangerina fresco"],steps:["Despeje o suco na flute.","Complete com prosecco. Não mexa demais."],notes:"Cítrico mais perfumado que o Mimosa.",rating:0,servings:"1",custom:false},
  {name:"Kir Royale",categories:["Espumante","Licor","Sparkling","Built"],ingredients:["120 ml champagne ou espumante brut","15 ml crème de cassis"],steps:["Coloque o cassis na flute.","Complete com champagne gelado."],notes:"Com vinho branco tranquilo vira Kir simples. O cassis deve ser de qualidade.",rating:0,servings:"1",custom:false},
  {name:"Tommy's Margarita",categories:["Tequila","Sour","Shaken"],ingredients:["60 ml tequila 100% agave","30 ml suco de limão","15 ml xarope de agave"],steps:["Combine tudo com gelo e agite.","Coe em rocks com gelo. Borda de sal opcional.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"Criado por Julio Bermejo. Sem triple sec — o agave deixa a tequila brilhar.",rating:0,servings:"1",custom:false},
  {name:"Caipiroska",categories:["Vodka","Smash","Built"],ingredients:["60 ml vodka","1 limão taiti","2 col. chá açúcar","gelo picado"],steps:["Corte o limão em 4 e macere com açúcar no copo.","Adicione gelo picado e a vodka.","Mexa vigorosamente."],notes:"A versão vodka da caipirinha. Mais suave e neutra.",rating:0,servings:"1",custom:false},
  {name:"White Russian",categories:["Vodka","Licor","Built"],ingredients:["50 ml vodka","25 ml Kahlúa","25 ml creme de leite fresco"],steps:["Coloque gelo em rocks.","Adicione vodka e Kahlúa.","Despeje o creme por cima devagar — sem mexer para criar camada."],notes:"Sem creme vira Black Russian.",rating:0,servings:"1",custom:false},
  {name:"Frozen Daiquiri",categories:["Rum Branco","Sour","Frozen","Blended"],ingredients:["60 ml rum branco","30 ml suco de limão","22 ml xarope simples","1 xícara gelo picado"],steps:["Bata tudo no liquidificador até ficar homogêneo.","Sirva em taça de coquetel gelada.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"A consistência certa é cremosa, não aguada. Ajuste o gelo.",rating:0,servings:"1",custom:false},
  {name:"Frozen Margarita",categories:["Tequila","Triple Sec","Sour","Frozen","Blended"],ingredients:["60 ml tequila","30 ml Cointreau","30 ml suco de limão","1 xícara gelo picado","sal na borda"],steps:["Prepare a borda com sal.","Bata tudo no liquidificador até ficar cremoso.","Sirva na taça preparada."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Mezcal Negroni",categories:["Mezcal","Campari","Vermute Rosso","Stirred"],ingredients:["30 ml mezcal","30 ml Campari","30 ml vermute tinto doce"],steps:["Mexa tudo com gelo por 30s.","Coe em rocks. Decore com casca de laranja."],notes:"O mezcal defumado transforma o Negroni. Use um mezcal com presença mas sem dominar.",rating:0,servings:"1",custom:false},
  {name:"Oaxacan Old Fashioned",categories:["Mezcal","Tequila","Stirred"],ingredients:["45 ml tequila reposado","15 ml mezcal","15 ml xarope de agave","2 dashes mole bitters (ou Angostura)","casca de laranja"],steps:["Combine tudo com gelo e mexa por 30s.","Coe em rocks com gelo grande.","Flambe a casca de laranja por cima. Decore.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"Criado por Phil Ward no Death & Co, NYC. O equilíbrio tequila/mezcal é o ponto.",rating:0,servings:"1",custom:false},
  {name:"Paloma Cordial",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","35 ml cordial de toranja","15 ml suco de limão taiti","pitada de sal","gotas de pimenta a gosto","água com gás para completar"],steps:["Coloque gelo em copo alto.","Adicione a tequila, o cordial de toranja e o suco de limão.","Tempere com sal e gotas de pimenta.","Complete com água com gás e mexa suavemente.","Receita de Cordial de Toranja disponível em Preparos Caseiros."],notes:"Versão com cordial caseiro de toranja no lugar do suco — mais concentrado e com os óleos da casca. A pimenta aparece no final.",rating:0,servings:"1",custom:false},
  {name:"Paloma",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","15 ml suco de limão","suco de toranja para completar","sal na borda (opcional)"],steps:["Prepare a borda com sal.","Adicione gelo, tequila e limão.","Complete com suco de toranja. Decore."],notes:"No México é mais popular que a Margarita.",rating:0,servings:"",custom:false},
  {name:"Tequila Sunrise",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","120 ml suco de laranja","15 ml grenadine"],steps:["Encha com gelo. Adicione tequila e suco de laranja.","Despeje a grenadine devagar pela lateral — ela afunda criando o degradê.","Receita de Grenadine Caseira disponível em Preparos Caseiros."],notes:"Não mexa depois da grenadine — o efeito é o ponto.",rating:0,servings:"",custom:false},
  {name:"Piña Colada",categories:["Rum Branco","Frozen","Tiki","Blended"],ingredients:["60 ml rum branco","90 ml suco de abacaxi","45 ml creme de coco","1 xícara gelo picado"],steps:["Bata tudo no liquidificador até textura cremosa e homogênea.","Sirva em copo alto. Decore com abacaxi e cereja."],notes:"A consistência certa é cremosa, não aguada — ajuste o gelo.",rating:0,servings:"1",custom:false},
  {name:"Mai Tai",categories:["Rum Envelhecido","Tiki","Sour","Shaken"],ingredients:["60 ml rum envelhecido","15 ml curaçao laranja","15 ml Xarope de amêndoa (Orgeat)","30 ml suco de limão"],steps:["Agite tudo com gelo.","Coe em rocks com gelo. Decore com hortelã e cereja.","Receita de Xarope de amêndoa (Orgeat) disponível em Preparos Caseiros."],notes:"Um clássico tiki. O orgeat é indispensável.",rating:0,servings:"",custom:false},
  {name:"Jungle Bird",categories:["Rum Envelhecido","Campari","Tiki","Sour","Shaken"],ingredients:["45 ml rum jamaicano escuro","22 ml Campari","45 ml suco de abacaxi","15 ml suco de limão","15 ml xarope demerara"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 12s.","Coe em rocks. Decore com abacaxi.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"O único clássico tiki com amaro. Surpreendente.",rating:0,servings:"1",custom:false},
  {name:"Irish Coffee",categories:["Whisky","Hot"],ingredients:["40 ml Irish whiskey","120 ml café quente","15 ml xarope simples","creme de leite levemente batido"],steps:["Aqueça a taça. Adicione whiskey e xarope.","Complete com café quente e mexa.","Despeje o creme por cima passando pelo dorso de uma colher.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O creme deve flutuar. Beba o café através do creme.",rating:0,servings:"",custom:false},
  {name:"Hot Toddy",categories:["Whisky","Hot"],ingredients:["60 ml whisky","25 ml mel","25 ml suco de limão","150 ml água quente","pau de canela","cravos"],steps:["Coloque mel, limão e especiarias na caneca.","Adicione o whisky.","Complete com água quente e mexa."],notes:"Perfeito para dias frios.",rating:0,servings:"",custom:false},
  {name:"Black Russian",categories:["Vodka","Licor","Stirred"],ingredients:["50 ml vodka","25 ml Kahlúa"],steps:["Coloque gelo em rocks.","Adicione vodka e Kahlúa. Mexa."],notes:"Com creme de leite vira White Russian.",rating:0,servings:"",custom:false},
  {name:"Godfather",categories:["Whisky","Amaretto","Amaro","Stirred"],ingredients:["45 ml Scotch whisky","25 ml Amaretto"],steps:["Coloque gelo em rocks.","Adicione e mexa suavemente."],notes:"Com vodka vira Godmother.",rating:0,servings:"",custom:false},
  {name:"Ramos Gin Fizz",categories:["Gin","Fizz","Shaken"],ingredients:["60 ml gin","15 ml suco de limão","15 ml suco de lima","30 ml creme de leite","1 clara de ovo","22 ml xarope simples","3 gotas água de flor de laranjeira","soda"],steps:["Dry shake TODOS os ingredientes por 2 minutos (sim, 2 min!).","Adicione gelo e agite por mais 1 minuto.","Coe em Collins sem gelo. Complete com soda.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O shake longo é o segredo da textura aerada.",rating:0,servings:"",custom:false},
  {name:"Vodka Tônica",categories:["Vodka","Highball","Built"],ingredients:["50 ml vodka","150 ml água tônica","rodela de limão"],steps:["Encha com gelo. Adicione vodka.","Complete com tônica pela lateral. Decore."],notes:"",rating:0,servings:"",custom:false},

  // ── CAIPIRINHAS ──
  {name:"Caipirinha Clássica",categories:["Cachaça","Smash","Built"],ingredients:["1 limão tahiti","60 ml cachaça","2 col. chá rasas de açúcar (10–12 g)","gelo"],steps:["Corte as pontas do limão, corte ao meio, retire o miolo branco central e corte em 8 pedaços.","Coloque o limão e o açúcar no copo e macere com calma — só até extrair suco e óleos da casca.","Encha o copo completamente com gelo.","Adicione a cachaça e mexa bem até o copo ficar gelado."],notes:"Retire o miolo branco — reduz o amargor. Não esmague demais a casca ou a bebida fica amarga e cansada.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha com Rapadura",categories:["Cachaça","Smash","Built"],ingredients:["1 limão tahiti","12–15 g de rapadura ralada","60 ml cachaça","gelo"],steps:["Macere o limão com a rapadura ralada.","Adicione gelo e cachaça.","Mexa bem."],notes:"Melhor com cachaça minimamente envelhecida ou Salinas. A rapadura traz melaço, cana fresca e notas tostadas.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Limão-Cravo",categories:["Cachaça","Smash","Built"],ingredients:["1 limão-cravo pequeno","1/2 limão tahiti","10 ml xarope demerara","60 ml cachaça branca","gelo"],steps:["Macere os limões com o xarope.","Adicione gelo e cachaça.","Mexa bem.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"O tahiti segura o frescor ácido; o cravo traz perfume e profundidade. Variação: troque o xarope por mel diluído para versão mais floral; adicione 1 rodela fina de gengibre para versão especiada e quente. Upgrade: 1 folha pequena de tangerina batida na mão.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Três Limões",categories:["Cachaça","Smash","Built"],ingredients:["1/2 limão tahiti","1/2 limão siciliano","1/4 limão-cravo","10 ml xarope simples","60 ml cachaça","gelo"],steps:["Macere os três limões com o xarope.","Adicione gelo e cachaça.","Mexa bem.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Maracujá e Limão",categories:["Cachaça","Smash","Built"],ingredients:["polpa de 1/2 maracujá pequeno","1/2 limão tahiti","7 ml xarope de mel","60 ml cachaça branca","gelo"],steps:["Macere o limão com o xarope.","Adicione a polpa de maracujá.","Adicione gelo e cachaça.","Mexa bem.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"O limão é essencial — sem ele o maracujá fica pesado. 1 gota de solução salina faz o maracujá brilhar.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Abacaxi Tostado",categories:["Cachaça","Smash","Built"],ingredients:["3 cubos de abacaxi tostado","1/2 limão tahiti","10 ml xarope demerara","60 ml cachaça","gelo"],steps:["Doure cubos de abacaxi em frigideira seca até caramelizar levemente.","Macere o abacaxi tostado com o limão e o xarope.","Adicione gelo e cachaça.","Mexa bem.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"O tostado cria profundidade e reduz a sensação de suquinho.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Cambuci",categories:["Cachaça","Smash","Built"],ingredients:["cambuci fresco","1/2 limão tahiti","xarope simples a gosto","60 ml cachaça branca mineral","gelo"],steps:["Macere o cambuci com o limão e o xarope.","Adicione gelo e cachaça.","Mexa bem.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Absurdamente paulista. Perfil verde, ácido, herbal, quase vínico. Fica maravilhosa com cachaça branca mineral.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Limão-Siciliano e Capim-Santo",categories:["Cachaça","Smash","Built"],ingredients:["1/2 limão siciliano","1 pedaço pequeno de capim-santo","10 ml xarope simples","60 ml cachaça branca mineral","gelo"],steps:["Amasse muito levemente o capim-santo — só para acordar os óleos, não macere como hortelã.","Macere o limão com o xarope.","Adicione o capim-santo, gelo e cachaça.","Mexa bem.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Cítrica, herbal, elegante. Quase spa brasileiro sofisticado.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Tangerina Verde e Salina",categories:["Cachaça","Smash","Built"],ingredients:["1/2 tangerina verde (mais ácida)","1/4 limão tahiti","8 ml xarope simples","60 ml cachaça","2 gotas de solução salina","gelo"],steps:["Macere a tangerina e o limão com o xarope.","Adicione gelo e cachaça.","Finalize com as gotas de salina.","Mexa bem.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"A salina reduz o amargor, aumenta a suculência e faz a tangerina brilhar. Cara de varanda no fim da tarde.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Caju e Mel",categories:["Cachaça","Smash","Built"],ingredients:["1/2 caju maduro","1/2 limão tahiti","8 ml mel leve","60 ml cachaça","gelo"],steps:["Macere o limão primeiro.","Adicione o caju levemente — não destrua.","Adicione mel, gelo e cachaça.","Mexa bem."],notes:"Não destrua o caju na maceração — amarga rápido. Tropical seco com final levemente tânico.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Maracujá e Kaffir",categories:["Cachaça","Smash","Built"],ingredients:["polpa de 1/2 maracujá","1/2 limão tahiti","1 folha de kaffir","7 ml xarope demerara","60 ml cachaça","gelo"],steps:["Bata a folha de kaffir na palma da mão.","Macere o limão com o xarope.","Adicione o maracujá, a folha e o gelo.","Adicione a cachaça e mexa bem.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"Só bater a folha na mão já perfuma tudo. Cítrico profundo, floral, verde, muito aromático.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Uva Verde",categories:["Cachaça Envelhecida","Smash","Built"],ingredients:["6 uvas verdes","1/3 limão siciliano","50 ml cachaça envelhecida","5 ml xarope simples","gelo"],steps:["Macere as uvas com o limão e o xarope.","Adicione gelo e cachaça envelhecida.","Mexa bem.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Melhor com madeira de carvalho, amendoim ou bálsamo. Seco, elegante, quase vinho branco aromático.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Caju Clássica",categories:["Cachaça","Smash","Built"],ingredients:["1/2 caju maduro","1/2 limão tahiti","8 ml xarope demerara","60 ml cachaça branca","gelo"],steps:["Macere o limão primeiro com o xarope.","Adicione o caju por último, bem levemente.","Adicione gelo e cachaça.","Mexa bem.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"Macere o limão primeiro, o caju entra depois. Fresco, tropical seco, adulto, muito brasileiro.",rating:0,servings:"1",custom:false},
  {name:"Caju com Limão-Cravo",categories:["Cachaça","Smash","Built"],ingredients:["1/2 caju","1 limão-cravo pequeno","7 ml mel diluído","60 ml cachaça","gelo"],steps:["Macere o limão-cravo com o mel.","Adicione o caju levemente.","Adicione gelo e cachaça.","Mexa bem."],notes:"O limão-cravo amplifica o lado aromático do caju. Perfumado, macio, quase vinho branco tropical.",rating:0,servings:"1",custom:false},
  {name:"Caju, Salina e Pimenta-Rosa",categories:["Cachaça","Smash","Built"],ingredients:["1/2 caju","1/3 limão tahiti","7 ml xarope simples","60 ml cachaça","2 gotas salina","3 pimentas-rosa","gelo"],steps:["Macere levemente o caju com o limão e o xarope.","Adicione as pimentas-rosa com cuidado.","Adicione gelo e cachaça.","Finalize com a salina.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"A pimenta-rosa não deve dominar — entra como perfume. Salivante, aromática, sofisticada.",rating:0,servings:"1",custom:false},
  {name:"Caju Tostado",categories:["Cachaça Envelhecida","Smash","Built"],ingredients:["caju (pedaços dourados em frigideira)","1/2 limão tahiti","10 ml xarope demerara","60 ml cachaça envelhecida","gelo"],steps:["Sele rapidamente pedaços de caju numa frigideira quente até começar a dourar.","Macere o caju tostado com o limão e o xarope.","Adicione gelo e cachaça.","Mexa bem.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"O tostado traz castanha, caramelo leve e profundidade. Quase outonal brasileira.",rating:0,servings:"1",custom:false},
  {name:"Caju e Louro",categories:["Cachaça","Smash","Built"],ingredients:["1/2 caju","1/2 limão-cravo","1 folha pequena de louro fresco","7 ml mel","60 ml cachaça","gelo"],steps:["Bata a folha de louro na mão — não macere forte.","Macere o caju com o limão-cravo e o mel.","Adicione a folha, o gelo e a cachaça.","Mexa bem."],notes:"Herbal, quente, intrigante, elegante. Tem cara de drink de chef.",rating:0,servings:"1",custom:false},
  {name:"Caju e Coco Seco",categories:["Cachaça","Smash","Built"],ingredients:["1/2 caju","1/3 limão tahiti","5 ml xarope de coco seco tostado","60 ml cachaça","gelo"],steps:["Macere o caju com o limão e o xarope de coco.","Adicione gelo e cachaça.","Mexa bem."],notes:"Mais seco e aromático do que usar leite de coco. Tropical sofisticado.",rating:0,servings:"1",custom:false},
  {name:"Caju Vínico",categories:["Cachaça Envelhecida","Smash","Built"],ingredients:["1/2 caju bem maduro","1/4 limão siciliano","50 ml cachaça envelhecida","10 ml vermute branco seco","gelo"],steps:["Macere o caju com o limão.","Adicione gelo, cachaça envelhecida e vermute.","Mexa bem."],notes:"Vínico, herbal, elegante, complexo. Quase uma ponte entre caipirinha e coquetel clássico.",rating:0,servings:"1",custom:false},
  {name:"Caipirinha de Caju com Rum de Coco",categories:["Cachaça","Rum Branco","Smash","Built"],ingredients:["1/2 caju maduro","1/2 limão tahiti","45 ml cachaça branca","15 ml rum de coco","5 ml xarope simples (opcional)","gelo"],steps:["Macere o caju com o limão.","Adicione gelo, cachaça e rum de coco.","Mexa bem. Prove antes de adicionar o xarope.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Tropical, cremoso sem creme, fresco, adulto e claramente brasileiro.",rating:0,servings:"1",custom:false},

  // ── CAJU (outras bases) ──
  {name:"Caju & Oak",categories:["Whisky","Sour","Shaken"],ingredients:["50 ml bourbon","25 ml suco fresco de caju","15 ml limão tahiti","10 ml xarope demerara","2 dashes Angostura"],steps:["Combine todos os ingredientes no shaker com gelo.","Shake vigoroso.","Coe duplo em coupe.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"Quase um Whiskey Sour brasileiro — o caju traz acidez tropical e o demerara amplifica o lado amadeirado do bourbon.",rating:0,servings:"1",custom:false},
  {name:"Jardim de Caju",categories:["Gin","Sour","Shaken"],ingredients:["50 ml gin","30 ml suco fresco de caju","15 ml limão siciliano","10 ml xarope simples","1 folha pequena de manjericão"],steps:["Macere levemente o manjericão no shaker.","Adicione os demais ingredientes e gelo.","Shake e coe duplo em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Herbal, fresco e muito gastronômico. O manjericão amplia a complexidade verde do gin.",rating:0,servings:"1",custom:false},
  {name:"Caju Escuro",categories:["Rum Envelhecido","Sour","Shaken"],ingredients:["50 ml rum envelhecido","25 ml suco fresco de caju","10 ml limão-cravo","7 ml mel diluído","2 gotas de salina"],steps:["Combine todos os ingredientes no shaker com gelo.","Shake e coe duplo em coupe."],notes:"Tropical, macio e profundo. O mel e a salina arredondam o conjunto — quase um tiki sofisticado.",rating:0,servings:"1",custom:false},
  {name:"Caju Bianco",categories:["Gin","Sour","Shaken"],ingredients:["40 ml gin suave (ou vodka)","20 ml vermute branco seco","25 ml suco fresco de caju","10 ml limão siciliano"],steps:["Combine no shaker com gelo.","Shake leve e coe em coupe."],notes:"Vínico, herbal e delicado. O vermute seco e o caju criam uma combinação quase europeia.",rating:0,servings:"1",custom:false},
  {name:"Fumaça Tropical",categories:["Mezcal","Sour","Shaken"],ingredients:["40 ml mezcal","20 ml suco fresco de caju","10 ml limão tahiti","10 ml xarope de mel","pitada mínima de sal"],steps:["Combine todos os ingredientes no shaker com gelo.","Shake e coe duplo em coupe.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"O caju segura muito bem o defumado. Salino, terroso e tropical seco — quase culinário.",rating:0,servings:"1",custom:false},
  {name:"Caju Spritz",categories:["Aperol","Spritz"],ingredients:["30 ml Aperol","20 ml suco fresco de caju","60 ml espumante brut","20 ml soda","casca de laranja"],steps:["Monte diretamente na taça com bastante gelo.","Adicione Aperol, caju e espumante.","Complete com soda.","Expresse a casca de laranja sobre o drink."],notes:"Amargo leve, efervescente e tropical elegante. Verão brasileiro sofisticado.",rating:0,servings:"1",custom:false},
  {name:"Caju Noturno",categories:["Rum Envelhecido","Shaken"],ingredients:["40 ml rum envelhecido","20 ml café frio forte","20 ml suco fresco de caju","5 ml xarope demerara"],steps:["Combine no shaker com gelo.","Shake e coe duplo em coupe ou copo baixo.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"Seco, tostado e exótico. Mais interessante que um espresso martini tropical — o caju ilumina o café.",rating:0,servings:"1",custom:false},
  {name:"Caju Verde",categories:["Tequila","Sour","Shaken"],ingredients:["50 ml tequila blanco","25 ml suco fresco de caju","15 ml limão tahiti","10 ml xarope de agave","coentro ou capim-santo"],steps:["Macere levemente a erva no shaker.","Adicione os demais ingredientes com gelo.","Shake e coe duplo em coupe.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"Verde, cítrico e vibrante. A acidez vegetal da tequila e do caju se complementam de forma inesperada.",rating:0,servings:"1",custom:false},

  // ── MARACUJÁ ──
  {name:"Maracujá Tônico",categories:["Gin","Highball"],ingredients:["50 ml gin","15 ml polpa de maracujá","15 ml limão siciliano","10 ml xarope simples","água tônica"],steps:["Combine gin, maracujá, limão e xarope no shaker com gelo.","Shake e coe em copo highball com gelo.","Complete com água tônica.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Cítrico, seco e aromático. Refrescante sem parecer sobremesa.",rating:0,servings:"1",custom:false},
  {name:"Gold Passion",categories:["Whisky","Sour","Shaken"],ingredients:["50 ml bourbon","15 ml polpa de maracujá","10 ml limão tahiti","7 ml mel diluído","2 dashes Angostura"],steps:["Combine todos os ingredientes no shaker com gelo.","Shake vigoroso e coe duplo em coupe."],notes:"O maracujá combina muito com baunilha e madeira. Quente, ácido e profundo — tropical adulto.",rating:0,servings:"1",custom:false},
  {name:"Passo Solar",categories:["Tequila","Sour","Shaken"],ingredients:["50 ml tequila blanco","15 ml polpa de maracujá","15 ml limão tahiti","5 ml xarope de agave","pitada mínima de sal"],steps:["Combine no shaker com gelo.","Shake e coe duplo em coupe.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"Vibrante, cítrico e salivante. Muito melhor que versões congeladas açucaradas.",rating:0,servings:"1",custom:false},
  {name:"Maracujá Amargo",categories:["Campari","Highball"],ingredients:["30 ml Campari","30 ml gin","15 ml polpa de maracujá","soda"],steps:["Combine Campari, gin e maracujá no copo com gelo.","Complete com soda.","Mexa suavemente."],notes:"Bitter tropical, refrescante e adulto. Quase italiano-brasileiro.",rating:0,servings:"1",custom:false},
  {name:"Linha do Equador",categories:["Rum Branco","Shaken"],ingredients:["40 ml rum branco","10 ml rum de coco","15 ml polpa de maracujá","10 ml limão tahiti","2 gotas de salina"],steps:["Combine no shaker com gelo.","Shake e coe duplo em coupe."],notes:"Muito mais seco e elegante que piña colada. O rum de coco dá profundidade sem pesar.",rating:0,servings:"1",custom:false},
  {name:"Pornstar Martini",categories:["Vodka","Shaken"],ingredients:["45 ml vodka","15 ml licor de baunilha","15 ml polpa de maracujá","15 ml xarope simples","15 ml limão tahiti","shot de espumante (ao lado)"],steps:["Combine vodka, licor, maracujá, xarope e limão no shaker com gelo.","Dry shake, depois shake com gelo.","Coe duplo em coupe.","Sirva o shot de espumante separado.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Puxado com menos baunilha e espumante mais seco, vira quase um sour tropical elegante.",rating:0,servings:"1",custom:false},
  {name:"Saturn",categories:["Gin","Tiki","Shaken"],ingredients:["45 ml gin","15 ml polpa de maracujá","15 ml limão siciliano","15 ml Xarope de amêndoa (Orgeat)","7 ml falernum"],steps:["Combine todos os ingredientes no shaker com gelo.","Shake e coe em copo Tiki ou highball com gelo britado.","Receitas de Xarope de amêndoa (Orgeat) e Falernum Caseiro disponíveis em Preparos Caseiros."],notes:"Clássico cult de tiki. Herbal, tropical e complexo — um dos drinks de maracujá mais sofisticados já feitos.",rating:0,servings:"1",custom:false},
  {name:"Hurricane",categories:["Rum Envelhecido","Tiki","Shaken"],ingredients:["60 ml rum escuro","30 ml polpa de maracujá","20 ml limão tahiti","10 ml xarope simples"],steps:["Combine no shaker com gelo.","Shake vigoroso e coe em copo Hurricane ou highball com gelo.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Clássico de New Orleans. A receita original, mais seca, é muito melhor que versões açucaradas.",rating:0,servings:"1",custom:false},
  {name:"Cobra's Fang",categories:["Rum Envelhecido","Tiki","Shaken"],ingredients:["45 ml rum envelhecido","15 ml rum overproof","20 ml polpa de maracujá","20 ml limão tahiti","15 ml falernum","1 dash absinto","1 dash Angostura"],steps:["Combine no shaker com gelo.","Shake e coe em copo Tiki ou highball com gelo britado.","Receita de Falernum Caseiro disponível em Preparos Caseiros."],notes:"Clássico Tiki. O absinto e o falernum criam camadas complexas — muito mais profundo do que parece.",rating:0,servings:"1",custom:false},
  {name:"Passion Fruit Margarita",categories:["Tequila","Sour","Shaken"],ingredients:["50 ml tequila blanco","20 ml polpa de maracujá","20 ml limão tahiti","10 ml xarope de agave","5 ml Cointreau (opcional)","pitada mínima de sal"],steps:["Combine no shaker com gelo.","Shake vigoroso e coe em rocks com gelo ou coupe.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"Moderno praticamente obrigatório. O maracujá traz acidez tropical sem peso de sobremesa.",rating:0,servings:"1",custom:false},
  {name:"Whiskey Sour de Maracujá",categories:["Whisky","Sour","Shaken"],ingredients:["50 ml bourbon","15 ml polpa de maracujá","20 ml limão tahiti","10 ml mel diluído","clara de ovo (opcional)"],steps:["Dry shake sem gelo se usar clara.","Shake com gelo.","Coe duplo em coupe."],notes:"Sedoso, ácido e quente. O maracujá entra como par natural da baunilha e da madeira do bourbon.",rating:0,servings:"1",custom:false},

  // ── CAJUÍNA ──
  {name:"Highball de Cajuína",categories:["Whisky","Highball"],ingredients:["45 ml bourbon ou whisky leve","90 ml cajuína gelada","2 gotas de salina","gelo grande"],steps:["Monte direto no copo com gelo.","Adicione o bourbon e complete com a cajuína.","Mexa suavemente."],notes:"Sofisticado e quase chá gelado alcoólico. A cajuína amplifica a baunilha e o caramelo do bourbon.",rating:0,servings:"1",custom:false},
  {name:"Gin & Cajuína",categories:["Gin","Highball"],ingredients:["50 ml gin","80 ml cajuína gelada","10 ml limão siciliano","gelo","casca de limão"],steps:["Monte no copo highball com gelo.","Adicione gin e limão, complete com cajuína.","Expresse a casca sobre o drink."],notes:"Herbal, cítrico e extremamente refrescante. Primo brasileiro do Tom Collins minimalista.",rating:0,servings:"1",custom:false},
  {name:"Rabo de Galo com Cajuína",categories:["Cachaça Envelhecida","Stirred","Built"],ingredients:["45 ml cachaça envelhecida","20 ml vermute rosso","30 ml cajuína","1 dash Angostura"],steps:["Combine todos os ingredientes em copo mixing com gelo.","Mexa até atingir temperatura e diluição ideais.","Coe em rocks com gelo grande."],notes:"Vínico, brasileiro e sofisticado. Quase um Manhattan nordestino.",rating:0,servings:"1",custom:false},
  {name:"Cajuína & Mezcal",categories:["Mezcal","Highball"],ingredients:["35 ml mezcal","70 ml cajuína gelada","10 ml limão-cravo","pitada mínima de sal"],steps:["Monte no copo com gelo grande.","Adicione mezcal e limão, complete com cajuína.","Mexa suavemente."],notes:"O lado tostado da cajuína conversa muito bem com a fumaça. Defumado, salino e contemplativo.",rating:0,servings:"1",custom:false},
  {name:"Cajuína Old Fashioned",categories:["Whisky","Stirred","Built"],ingredients:["50 ml bourbon","20 ml cajuína","2 dashes Angostura"],steps:["Combine em copo rocks com gelo grande.","Mexa até integrar."],notes:"A cajuína entra quase como açúcar, fruta e textura ao mesmo tempo — suaviza e adiciona profundidade.",rating:0,servings:"1",custom:false},
  {name:"Tequila & Cajuína",categories:["Tequila","Highball"],ingredients:["45 ml tequila blanco","70 ml cajuína gelada","10 ml limão tahiti","pitada mínima de sal"],steps:["Monte no copo highball com gelo.","Adicione tequila e limão, complete com cajuína.","Mexa suavemente."],notes:"Vegetal, seco e tropical elegante. Muito subestimado.",rating:0,servings:"1",custom:false},

  // ── CACHAÇA ──
  {name:"Batida de Coco",categories:["Cachaça","Blended","Shaken"],ingredients:["60 ml cachaça","100 ml leite de coco","30 ml leite condensado","gelo"],steps:["Bata tudo na coqueteleira ou liquidificador.","Sirva em copo alto com gelo."],notes:"Pode usar coco fresco ralado para decorar.",rating:0,servings:"",custom:false},
  {name:"Batida de Maracujá",categories:["Cachaça","Shaken"],ingredients:["60 ml cachaça","80 ml suco de maracujá","30 ml leite condensado","gelo"],steps:["Bata tudo na coqueteleira.","Sirva em copo alto com gelo."],notes:"",rating:0,servings:"",custom:false},
  {name:"Cachaça Sour",categories:["Cachaça","Sour","Shaken"],ingredients:["60 ml cachaça","25 ml suco de limão","20 ml xarope simples","1 clara de ovo (opcional)"],steps:["Dry shake se usar clara.","Adicione gelo e agite.","Coe em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Quentão",categories:["Cachaça","Hot"],ingredients:["500 ml cachaça","500 ml água","200 g açúcar","5 cravos","3 paus de canela","1 laranja em rodelas","gengibre a gosto"],steps:["Leve tudo ao fogo baixo até dissolver o açúcar.","Deixe ferver levemente por 10 min.","Sirva quente."],notes:"Clássico junino.",rating:0,servings:"6",custom:false},
  {name:"Rabo de Galo",categories:["Cachaça","Stirred"],ingredients:["50 ml cachaça","25 ml Cynar","1 dash Angostura","casca de laranja"],steps:["Mexa todos os ingredientes com gelo.","Coe em rocks com gelo.","Expresse a casca de laranja."],notes:"O Negroni brasileiro.",rating:0,servings:"",custom:false},
  {name:"Leite de Onça",categories:["Cachaça","Stirred"],ingredients:["50 ml cachaça","50 ml leite de coco","30 ml leite condensado","canela em pó"],steps:["Misture tudo com gelo.","Sirva em copo e finalize com canela."],notes:"Drink típico de festas juninas.",rating:0,servings:"",custom:false},
  {name:"Caju Amigo",categories:["Cachaça","Highball","Built"],ingredients:["1 pedaço de caju da compota","60 ml cachaça","45 ml suco concentrado de caju","30 ml suco de limão taiti","20 ml calda da compota de caju","gelo"],steps:["Coloque o pedaço de caju no fundo do copo.","Adicione gelo.","Despeje a cachaça, o suco de caju, o suco de limão e a calda da compota.","Mexa delicadamente e sirva.","Receita de Compota de Caju disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Macunaíma",categories:["Cachaça","Fernet","Sour","Shaken"],ingredients:["50 ml cachaça","20 ml suco de limão","10 ml xarope simples","5 ml Fernet-Branca"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 12s.","Coe em taça coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O Fernet-Branca é o detalhe — amargura e complexidade sem dominar.",rating:0,servings:"",custom:false},
  {name:"Gabriela",categories:["Cachaça","Smash","Built"],ingredients:["50 ml cachaça","cravo e canela infusionados (48h na cachaça)","açúcar a gosto","suco de limão a gosto"],steps:["Infuse cravo e canela na cachaça por 24 a 48h.","Combine a cachaça infusionada com açúcar e limão em copo com gelo.","Mexa suavemente e sirva."],notes:"Regional e especiada. A infusão define o caráter do drink.",rating:0,servings:"",custom:false},
  {name:"Cachaça Collins",categories:["Cachaça","Collins","Built"],ingredients:["50 ml cachaça","25 ml suco de limão","15 ml xarope simples","soda gelada","gelo"],steps:["Combine cachaça, limão e xarope na coqueteleira com gelo.","Agite e coe em copo alto com gelo.","Complete com soda. Mexa suavemente.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Versão brasileira do Collins. Refrescante e muito acessível.",rating:0,servings:"",custom:false},

  // ── CACHAÇA ENVELHECIDA ──
  {name:"Old Fashioned de Cachaça",categories:["Cachaça Envelhecida","Stirred"],ingredients:["60 ml cachaça envelhecida","1 col. de chá de açúcar (ou 10 ml xarope simples)","2 dashes Angostura bitters","casca de laranja"],steps:["Dissolva o açúcar com os bitters e um splash de água.","Adicione a cachaça e gelo grande.","Mexa por 30s.","Expresse a casca de laranja sobre o drink e decore.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"A madeira da cachaça envelhecida brilha sem distração. Se você tiver que escolher um, é esse.",rating:0,servings:"",custom:false},
  {name:"Caipirinha Envelhecida",categories:["Cachaça Envelhecida","Smash","Built"],ingredients:["60 ml cachaça envelhecida","1 limão tahiti","2 col. de chá de açúcar"],steps:["Macere o limão com o açúcar.","Adicione a cachaça envelhecida e gelo.","Mexa suavemente — não precisa ser vigoroso."],notes:"Mais profunda e arredondada que a clássica. Prefira cachaça com 2+ anos de barril.",rating:0,servings:"",custom:false},
  {name:"Honey & Wood",categories:["Cachaça Envelhecida","Sour","Shaken"],ingredients:["50 ml cachaça envelhecida","20 ml suco de limão siciliano","15 ml mel diluído (50/50 com água)"],steps:["Dilua o mel com água morna em proporção igual.","Combine tudo na coqueteleira com gelo.","Agite por 15s e coe em coupe."],notes:"Mel amplifica as notas amadeiradas. Gold Rush com alma brasileira.",rating:0,servings:"",custom:false},
  {name:"Julep Brasileiro",categories:["Cachaça Envelhecida","Smash","Built"],ingredients:["60 ml cachaça envelhecida","10 ml xarope simples","hortelã fresca"],steps:["Macere levemente as folhas de hortelã com o xarope no fundo do copo.","Adicione a cachaça.","Preencha com gelo triturado e mexa suavemente.","Decore com bouquet generoso de hortelã.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O gelo triturado dilui progressivamente — beba rápido. Fundo amadeirado com frescor.",rating:0,servings:"",custom:false},
  {name:"Amaro Tropical",categories:["Cachaça Envelhecida","Stirred"],ingredients:["50 ml cachaça envelhecida","20 ml Averna","10 ml suco de laranja","1 dash Angostura"],steps:["Combine tudo no copo misturador com gelo.","Mexa por 30s.","Coe em rocks com gelo grande."],notes:"Amaro-doce com fundo tropical. A laranja equilibra sem adoçar em excesso.",rating:0,servings:"",custom:false},
  {name:"Madeira & Abacaxi",categories:["Cachaça Envelhecida","Sour","Shaken"],ingredients:["50 ml cachaça envelhecida","30 ml suco de abacaxi","10 ml suco de limão","10 ml xarope simples"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em coupe ou rocks com gelo.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Abacaxi e madeira têm afinidade natural. Tropical com estrutura.",rating:0,servings:"",custom:false},
  {name:"Café com Cachaça",categories:["Cachaça Envelhecida","Stirred"],ingredients:["40 ml cachaça envelhecida","30 ml café espresso","10 ml xarope simples"],steps:["Para frio: combine tudo na coqueteleira com gelo, agite e coe em coupe.","Para quente: mexa tudo em xícara aquecida e sirva.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Madeira + torrado = combo irresistível. Funciona quente no inverno, gelado no verão.",rating:0,servings:"",custom:false},
  {name:"Orchard Brasileiro",categories:["Cachaça Envelhecida","Sour","Shaken"],ingredients:["50 ml cachaça envelhecida","30 ml suco de maçã","10 ml suco de limão"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 12s.","Coe em coupe gelada."],notes:"Leve, frutado, com final seco. Maçã e cachaça envelhecida têm afinidade natural.",rating:0,servings:"",custom:false},
  {name:"Cachaça Manhattan",categories:["Cachaça Envelhecida","Vermute Rosso","Stirred"],ingredients:["50 ml cachaça envelhecida","25 ml vermute tinto doce","2 dashes Angostura"],steps:["Combine tudo no copo misturador com gelo.","Mexa por 30s.","Coe em taça coupe ou Nick and Nora.","Decore com cereja ou casca de laranja."],notes:"O sotaque brasileiro do Manhattan. A cachaça envelhecida suporta bem o vermute.",rating:0,servings:"",custom:false},
  {name:"Spiced Cane",categories:["Cachaça Envelhecida","Sour","Shaken"],ingredients:["50 ml cachaça envelhecida","20 ml xarope de gengibre","10 ml suco de limão"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 12s.","Coe em coupe ou sirva em rocks com gelo.","Receita de Xarope de Gengibre disponível em Preparos Caseiros."],notes:"Picante + madeira = combo muito aromático e quente.",rating:0,servings:"",custom:false},
  {name:"Rabo de Galo Envelhecido",categories:["Cachaça Envelhecida","Cynar","Vermute Rosso","Stirred"],ingredients:["50 ml cachaça envelhecida","20 ml vermute tinto","10 ml Cynar"],steps:["Combine tudo no copo misturador com gelo.","Mexa por 30s.","Coe em coupe ou rocks com gelo grande."],notes:"Mais elegante que o clássico — a envelhecida sobe o nível do Rabo de Galo.",rating:0,servings:"",custom:false},
  {name:"Sazerac Brasileiro",categories:["Cachaça Envelhecida","Absinto","Stirred"],ingredients:["60 ml cachaça envelhecida","1 cubo de açúcar","2 dashes Angostura","rinse de absinto","casca de limão"],steps:["Enxague o copo com absinto e descarte o excesso.","Dissolva o açúcar com a Angostura.","Adicione a cachaça e gelo.","Mexa e sirva sem gelo. Expresse a casca de limão."],notes:"A cachaça envelhecida no lugar do rye funciona surpreendentemente bem.",rating:0,servings:"",custom:false},
  {name:"Tropical Old Fashioned",categories:["Cachaça Envelhecida","Stirred"],ingredients:["50 ml cachaça envelhecida","5 ml xarope de abacaxi (ou toque de suco reduzido)","2 dashes bitters aromático"],steps:["Combine tudo no copo com gelo grande.","Mexa por 30s.","Sirva no mesmo copo. Decore com casca de laranja."],notes:"Twist tropical que não vira suco — o abacaxi é acento, não protagonista.",rating:0,servings:"",custom:false},

  // ── COGNAC / BRANDY ──
  {name:"Brandy Alexander",categories:["Conhaque","Licor","Shaken"],ingredients:["30 ml conhaque","30 ml creme de cacau escuro","30 ml creme de leite fresco","noz-moscada"],steps:["Bata tudo com gelo.","Coe em taça coupe.","Finalize com noz-moscada ralada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Between the Sheets",categories:["Conhaque","Rum Branco","Triple Sec","Sour","Shaken"],ingredients:["30 ml conhaque","30 ml rum branco","30 ml Cointreau","15 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em taça coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Stinger",categories:["Conhaque","Licor","Stirred"],ingredients:["60 ml conhaque","20 ml creme de menta branco"],steps:["Mexa com gelo.","Coe em coupe ou sirva em rocks com gelo britado."],notes:"",rating:0,servings:"",custom:false},
  {name:"French Connection",categories:["Conhaque","Stirred"],ingredients:["45 ml conhaque","25 ml Amaretto"],steps:["Coloque gelo em rocks.","Adicione e mexa suavemente."],notes:"",rating:0,servings:"",custom:false},

  // ── TEQUILA / MEZCAL ──
  {name:"Spicy Margarita",categories:["Tequila","Triple Sec","Sour","Shaken"],ingredients:["60 ml tequila blanco","30 ml suco de limão","20 ml Cointreau","3 rodelas jalapeño","sal na borda"],steps:["Macere o jalapeño com a tequila.","Bata com os demais ingredientes e gelo.","Coe na borda salgada."],notes:"",rating:0,servings:"",custom:false},
  {name:"Ranch Water",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila blanco","30 ml suco de limão","150 ml água com gás (Topo Chico)"],steps:["Combine em copo alto com gelo.","Mexa delicadamente."],notes:"Clássico do Texas, simples e refrescante.",rating:0,servings:"",custom:false},
  {name:"Batanga",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","30 ml suco de limão","Coca-Cola para completar","sal"],steps:["Borda o copo com sal.","Adicione gelo, limão e tequila.","Complete com Coca-Cola. Mexa com faca de cozinha."],notes:"Don Javier Delgado Corona, La Capilla, Tequila.",rating:0,servings:"",custom:false},
  {name:"Naked and Famous",categories:["Mezcal","Aperol","Licor","Sour","Shaken"],ingredients:["22 ml mezcal","22 ml Aperol","22 ml Yellow Chartreuse","22 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Variação do Paper Plane com mezcal.",rating:0,servings:"",custom:false},
  {name:"Mezcal Sour",categories:["Mezcal","Sour","Shaken"],ingredients:["60 ml mezcal","25 ml suco de limão","20 ml xarope de agave","1 clara de ovo"],steps:["Dry shake sem gelo.","Adicione gelo e agite.","Coe em coupe.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Matador",categories:["Tequila","Sour","Shaken"],ingredients:["45 ml tequila","90 ml suco de abacaxi","15 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em coupe ou sirva com gelo."],notes:"",rating:0,servings:"",custom:false},
  {name:"Agave Spritz",categories:["Tequila","Spritz","Built"],ingredients:["50 ml tequila blanco","20 ml suco de limão siciliano","15 ml xarope de agave","água com gás para completar","rodela de laranja"],steps:["Adicione gelo em copo alto.","Despeje a tequila, o limão e o xarope de agave.","Complete com água com gás.","Decore com rodela de laranja e mexa levemente.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"Leve, cítrico e refrescante. Mais elegante que parece.",rating:0,servings:"1",custom:false},
  {name:"Verde Brisa",categories:["Tequila","Highball","Built"],ingredients:["50 ml tequila blanco","40 ml suco de abacaxi","20 ml suco de pepino","folhas de coentro a gosto","água com gás para completar"],steps:["Macere levemente o coentro no copo.","Adicione gelo, tequila, suco de abacaxi e pepino.","Complete com água com gás e mexa suave."],notes:"Tropical, herbáceo e surpreendente. O coentro transforma o copo.",rating:0,servings:"1",custom:false},
  {name:"Sol e Sal",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila blanco","60 ml suco de grapefruit (toranja)","15 ml xarope de mel","sal na borda","gelo"],steps:["Prepare a borda com sal.","Adicione gelo no copo alto.","Despeje a tequila, o suco de grapefruit e o xarope de mel.","Mexa levemente.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"Uma Paloma com alma de mel. O sal na borda equilibra o amargo da toranja.",rating:0,servings:"1",custom:false},
  {name:"Sombra na Areia",categories:["Mezcal","Sour","Shaken"],ingredients:["45 ml mezcal","30 ml suco de abacaxi","20 ml suco de limão","sal defumado na borda"],steps:["Prepare a borda com sal defumado.","Bata mezcal, abacaxi e limão com gelo.","Coe em coupe ou rocks com borda preparada."],notes:"Cada gole é um pôr do sol no deserto. O defumado do mezcal casa perfeitamente com o tropical.",rating:0,servings:"1",custom:false},
  {name:"Cacto Poético",categories:["Tequila","Sour","Shaken"],ingredients:["50 ml tequila blanco","30 ml suco de grapefruit","20 ml xarope de mel","1 raminho de alecrim","gelo"],steps:["Macere o alecrim levemente na coqueteleira.","Adicione os demais ingredientes com gelo.","Bata e coe duplo em coupe.","Decore com ramo de alecrim.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"Cítrico com final herbal. Como se Neruda tivesse um bar mexicano.",rating:0,servings:"1",custom:false},
  {name:"Bruma de Agave",categories:["Mezcal","Triple Sec","Sour","Shaken"],ingredients:["45 ml mezcal","20 ml Cointreau","20 ml suco de limão","10 ml xarope de agave","sal defumado na borda (opcional)"],steps:["Prepare a borda com sal defumado, se quiser.","Bata tudo com gelo.","Coe em coupe ou taça de Margarita.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"Uma Margarita com alma defumada. O agave dança entre o doce e o intenso.",rating:0,servings:"1",custom:false},
  {name:"Fumaça de Frutas",categories:["Mezcal","Sour","Shaken"],ingredients:["45 ml mezcal","30 ml purê de maracujá","15 ml xarope de mel","1 rodela de pimenta dedo-de-moça","gelo"],steps:["Macere a pimenta levemente na coqueteleira.","Adicione mezcal, maracujá e mel com gelo.","Bata bem e coe duplo em coupe.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"Um carnaval de fumaça e tropicalidade. A pimenta aparece no final — do tipo que faz você pedir outro.",rating:0,servings:"1",custom:false},

  // ── VODKA ──
  {name:"Vesper",categories:["Gin","Vodka","Lillet","Stirred"],ingredients:["45 ml gin","15 ml vodka","15 ml Lillet Blanc","twist de limão"],steps:["Mexa todos os ingredientes com gelo.","Coe em coupe gelado.","Finalize com twist de limão."],notes:"Seco, forte, sofisticado. Aqui o Lillet entra como um perfume.",rating:0,servings:"1",custom:false},
  {name:"Bloody Mary",categories:["Vodka","Highball","Built"],ingredients:["60 ml vodka","120 ml suco de tomate","15 ml suco de limão","2 dash molho inglês","2 dash Tabasco","sal de aipo","pimenta-do-reino"],steps:["Combine tudo em copo alto com gelo.","Role o copo (não mexa) para misturar.","Decore a gosto."],notes:"",rating:0,servings:"",custom:false},
  {name:"Harvey Wallbanger",categories:["Vodka","Licor","Highball","Built"],ingredients:["45 ml vodka","100 ml suco de laranja","15 ml Galliano","gelo"],steps:["Combine vodka e suco em copo alto com gelo.","Float o Galliano por cima."],notes:"",rating:0,servings:"",custom:false},
  {name:"Sex on the Beach",categories:["Vodka","Highball","Built"],ingredients:["40 ml vodka","20 ml schnapps de pêssego","40 ml suco de laranja","40 ml suco de cranberry"],steps:["Combine tudo em copo alto com gelo.","Mexa e decore com laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Lemon Drop",categories:["Vodka","Triple Sec","Sour","Shaken"],ingredients:["60 ml vodka cítrica","30 ml suco de limão","20 ml Cointreau","15 ml xarope simples","açúcar na borda"],steps:["Bata tudo com gelo.","Coe em coupe com borda açucarada.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mule de Framboesa",categories:["Vodka","Buck","Highball","Built"],ingredients:["50 ml vodka","20 ml xarope de framboesa","15 ml suco de limão","120 ml cerveja de gengibre","framboesas frescas"],steps:["Combine vodka, xarope e limão em Moscow Mule mug com gelo.","Complete com ginger beer.","Decore com framboesas."],notes:"",rating:0,servings:"",custom:false},

  // ── RUM ──
  {name:"El Presidente",categories:["Rum Envelhecido","Triple Sec","Stirred"],ingredients:["60 ml rum dourado","30 ml vermute branco","15 ml Cointreau","1 dash grenadine","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Expresse a casca de laranja.","Receita de Grenadine Caseira disponível em Preparos Caseiros."],notes:"Clássico cubano dos anos 1920.",rating:0,servings:"",custom:false},
  {name:"Planter's Punch",categories:["Rum Envelhecido","Highball","Built"],ingredients:["60 ml rum escuro","30 ml suco de limão","20 ml grenadine","soda para completar","dash de Angostura"],steps:["Combine rum, limão e grenadine em copo alto com gelo.","Complete com soda.","Dash de Angostura por cima.","Receita de Grenadine Caseira disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Rum Old Fashioned",categories:["Rum Envelhecido","Stirred"],ingredients:["60 ml rum envelhecido","5 ml xarope de açúcar mascavo","2 dash Angostura","casca de laranja"],steps:["Dissolva o xarope com os bitters.","Adicione rum e gelo. Mexa bem.","Expresse a casca de laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Painkiller",categories:["Rum Envelhecido","Tiki","Shaken"],ingredients:["60 ml rum escuro","120 ml suco de abacaxi","30 ml creme de coco","30 ml suco de laranja","noz-moscada"],steps:["Bata tudo com gelo.","Sirva em copo alto.","Rale noz-moscada por cima."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mary Pickford",categories:["Rum Branco","Luxardo Maraschino","Tiki","Shaken"],ingredients:["60 ml rum branco","60 ml suco de abacaxi","15 ml Maraschino","1 dash grenadine"],steps:["Bata tudo com gelo.","Coe em coupe.","Receita de Grenadine Caseira disponível em Preparos Caseiros."],notes:"Clássico da Era Proibição, Cuba.",rating:0,servings:"",custom:false},

  // ── GIN ──
  {name:"Tom Collins",categories:["Gin","Collins","Built"],ingredients:["60 ml gin","30 ml suco de limão","15 ml xarope simples","soda para completar","rodela de limão e cereja"],steps:["Combine gin, limão e xarope em copo Collins com gelo.","Complete com soda.","Decore.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Corpse Reviver #2",categories:["Gin","Lillet","Triple Sec","Absinto","Sour","Shaken"],ingredients:["22 ml gin","22 ml Cointreau","22 ml Lillet Blanc","22 ml suco de limão","1 dash absinthe"],steps:["Enxague a taça com absinthe e descarte.","Bata o restante com gelo.","Coe na taça."],notes:"Para ressuscitar na manhã seguinte.",rating:0,servings:"",custom:false},
  {name:"White Lady",categories:["Gin","Triple Sec","Sour","Shaken"],ingredients:["45 ml gin","25 ml Cointreau","20 ml suco de limão","1 clara de ovo (opcional)"],steps:["Dry shake se usar clara.","Adicione gelo e agite.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Hanky Panky",categories:["Gin","Fernet","Stirred"],ingredients:["45 ml gin","45 ml vermute doce","7 ml Fernet-Branca","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Expresse a casca de laranja."],notes:"Criado por Ada Coleman, Savoy Hotel, 1925.",rating:0,servings:"",custom:false},
  {name:"Southside",categories:["Gin","Sour","Shaken"],ingredients:["60 ml gin","25 ml suco de limão","20 ml xarope simples","6 folhas de hortelã"],steps:["Macere levemente a hortelã.","Bata tudo com gelo.","Coe duplo em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Gin Mojito elegante.",rating:0,servings:"",custom:false},
  {name:"20th Century",categories:["Gin","Lillet","Sour","Shaken"],ingredients:["45 ml gin","20 ml Lillet Blanc","20 ml creme de cacau branco","20 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Equilibra floral, cítrico e chocolate branco.",rating:0,servings:"",custom:false},

  // ── WHISKEY ──
  {name:"Black Manhattan",categories:["Whisky","Averna","Stirred"],ingredients:["60 ml whisky de centeio","30 ml Averna Amaro","1 dash Angostura","1 dash Orange Bitters","cereja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Decore com cereja."],notes:"Averna no lugar do vermute.",rating:0,servings:"",custom:false},
  {name:"Toronto",categories:["Whisky","Fernet","Stirred"],ingredients:["60 ml whisky de centeio","15 ml Fernet-Branca","5 ml xarope simples","1 dash Angostura","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Expresse a casca.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Blood and Sand",categories:["Whisky","Licor","Vermute Rosso","Shaken"],ingredients:["22 ml Scotch whisky","22 ml Cherry Heering","22 ml vermute doce","22 ml suco de laranja"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"O único cocktail clássico com whisky batido.",rating:0,servings:"",custom:false},
  {name:"Horse's Neck",categories:["Whisky","Highball","Built"],ingredients:["60 ml bourbon","150 ml ginger ale","2 dash Angostura","casca de limão longa"],steps:["Enrole a casca de limão dentro do copo.","Adicione gelo e bourbon.","Complete com ginger ale e bitters."],notes:"",rating:0,servings:"",custom:false},

  // ── DRAMBUIE ──
  {name:"Highland Orchard",categories:["Drambuie","Collins","Built"],ingredients:["40 ml Drambuie","50 ml suco de maçã clarificado (ou integral leve)","10 ml suco de limão siciliano","soda para completar","gelo + casca de maçã"],steps:["Coloque Drambuie, maçã e limão num copo alto com gelo.","Complete com soda.","Mexa suavemente e decore com casca de maçã."],notes:"Maçã + mel + ervas — vibe de sidra escocesa imaginária.",rating:0,servings:"1",custom:false},
  {name:"Honey & Heather",categories:["Drambuie","Vermute seco","Stirred"],ingredients:["40 ml Drambuie","20 ml vermouth seco","10 ml licor de ervas (tipo Chartreuse verde)","1 dash bitters aromático"],steps:["Mexa tudo com gelo.","Coe em copo baixo com gelo grande."],notes:"Floral, levemente medicinal, final seco. Parece o interior da Escócia em forma de drink.",rating:0,servings:"1",custom:false},
  {name:"Golden Citrus Fizz",categories:["Drambuie","Fizz","Shaken"],ingredients:["35 ml Drambuie","25 ml suco de limão","1 clara de ovo","soda para completar"],steps:["Dry shake sem gelo por 15s.","Adicione gelo e agite novamente.","Coe em copo alto e complete com soda."],notes:"Espuma leve com mel cítrico vibrante.",rating:0,servings:"1",custom:false},
  {name:"Autumn Smoke",categories:["Whisky","Drambuie","Stirred"],ingredients:["30 ml Drambuie","30 ml whisky levemente turfado","10 ml xarope de maple","2 dashes bitters de chocolate","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo grande.","Expresse a casca de laranja."],notes:"Mel + fumaça + madeira = lareira líquida.",rating:0,servings:"1",custom:false},
  {name:"Bitter Hive",categories:["Drambuie","Campari","Sour","Shaken"],ingredients:["30 ml Drambuie","30 ml Campari","30 ml suco de laranja fresca","1 pitada de sal"],steps:["Bata tudo com gelo.","Coe em rocks com gelo."],notes:"Doce-amargo com final longo. O sal liga as duas partes sem fazer armistício.",rating:0,servings:"1",custom:false},
  {name:"Spiced Nightcap",categories:["Conhaque","Drambuie","Stirred"],ingredients:["40 ml Drambuie","20 ml conhaque","10 ml creme de cacau","1 dash bitters"],steps:["Mexa tudo com gelo.","Sirva em taça pequena ou coupe."],notes:"Meio bombom adulto derretido, meio digestivo elegante. Para terminar a noite.",rating:0,servings:"1",custom:false},
  {name:"Barley Highball",categories:["Drambuie","Highball","Built"],ingredients:["40 ml Drambuie","60 ml chá de cevada gelado (substitua por chá preto leve se preferir)","água com gás"],steps:["Coloque gelo num copo alto.","Adicione Drambuie e chá frio.","Complete com água com gás e decore."],notes:"Seco, elegante, quase japonês. A cevada conversa diretamente com o malte do Drambuie.",rating:0,servings:"1",custom:false},
  {name:"Tropical Heather",categories:["Drambuie","Sour","Shaken"],ingredients:["40 ml Drambuie","40 ml suco de abacaxi","10 ml suco de limão","2 dashes bitters aromático"],steps:["Bata tudo com gelo.","Coe em coupe ou rocks com gelo."],notes:"Abacaxi segura o mel e deixa as ervas mais exóticas. Inusitado, mas funciona.",rating:0,servings:"1",custom:false},

  // ── ST-GERMAIN ──
  {name:"Elder Fashion",categories:["Whisky","St‑Germain","Stirred"],ingredients:["50 ml bourbon","20 ml St-Germain","1 dash Angostura","casca de limão"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo.","Expresse a casca de limão."],notes:"Old Fashioned floral.",rating:0,servings:"",custom:false},
  {name:"French Gimlet",categories:["Gin","St‑Germain","Sour","Shaken"],ingredients:["50 ml gin","20 ml St-Germain","20 ml suco de limão siciliano"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Floral e refrescante.",rating:0,servings:"",custom:false},
  {name:"St-Germain Sour",categories:["St‑Germain","Sour","Shaken"],ingredients:["45 ml St-Germain","30 ml suco de limão siciliano","15 ml xarope simples","1 clara de ovo"],steps:["Dry shake.","Adicione gelo e agite.","Coe em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"The Harvest",categories:["Espumante","St‑Germain","Spritz","Built"],ingredients:["30 ml St-Germain","60 ml cidra brut","60 ml espumante","casca de maçã"],steps:["Combine em taça de vinho com gelo.","Decore com casca de maçã."],notes:"Outonal, floral e leve.",rating:0,servings:"",custom:false},
  {name:"Jardim Elétrico",categories:["Gin","St‑Germain","Collins","Shaken"],ingredients:["40 ml gin","25 ml St-Germain","15 ml suco de limão tahiti","10 ml solução salina (0,9%)","3 folhas de manjericão","soda para completar"],steps:["Macere levemente o manjericão na coqueteleira.","Adicione gin, St-Germain, limão e solução salina com gelo.","Bata e coe em copo alto com gelo.","Complete com soda."],notes:"O sal + manjericão puxam o St-Germain pra algo quase vegetal — jardim depois da chuva.",rating:0,servings:"1",custom:false},
  {name:"Pera & Fumaça",categories:["Whisky","St‑Germain","Stirred"],ingredients:["40 ml whisky (bourbon ou rye leve)","20 ml St-Germain","20 ml suco de pera (ou purê diluído)","2 dashes bitters aromático","borrifo de whisky turfado (opcional)"],steps:["Mexa whisky, St-Germain, pera e bitters com gelo.","Coe em copo baixo com gelo grande.","Borrifar whisky turfado por cima se desejar."],notes:"Flor + pera + madeira = quase um perfume bebível. O defumado entra como sombra, não como protagonista.",rating:0,servings:"1",custom:false},
  {name:"Citrus Cloud",categories:["Vodka","St‑Germain","Sour","Shaken"],ingredients:["35 ml vodka","25 ml St-Germain","20 ml suco de limão siciliano","10 ml xarope de mel leve","15 ml clara de ovo"],steps:["Dry shake sem gelo por 15s.","Adicione gelo e agite novamente.","Coe duplo em coupe.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"O floral vira espuma aromática — o cheiro vem antes do gole.",rating:0,servings:"1",custom:false},
  {name:"Vinho de Jardim",categories:["Vinho","St‑Germain","Spritz","Built"],ingredients:["60 ml vinho branco seco","20 ml St-Germain","10 ml verjus (ou limão suave)","10 ml xarope simples","água com gás para completar"],steps:["Coloque gelo num copo de vinho.","Adicione os ingredientes líquidos.","Complete com água com gás e mexa suavemente.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Parece um spritz alternativo, mas com cara de vinho aromatizado artesanal.",rating:0,servings:"1",custom:false},
  {name:"Chá da Tarde",categories:["Gin","St‑Germain","Highball","Built"],ingredients:["40 ml gin","20 ml St-Germain","40 ml chá verde frio","10 ml suco de limão","5 ml xarope simples"],steps:["Coloque gelo num copo alto.","Adicione todos os ingredientes.","Mexa suavemente.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O chá segura o floral e dá estrutura. Fica adulto, não perfumaria.",rating:0,servings:"1",custom:false},
  {name:"Dourado Amargo",categories:["Averna","St‑Germain","Highball","Built"],ingredients:["30 ml amaro (tipo Averna ou Montenegro)","20 ml St-Germain","20 ml suco de laranja","10 ml suco de limão","água tônica para completar"],steps:["Coloque gelo num copo alto.","Adicione amaro, St-Germain, laranja e limão.","Complete com tônica e mexa suavemente."],notes:"O St-Germain não só adoça — ele arredonda o amaro.",rating:0,servings:"1",custom:false},
  {name:"Estufa",categories:["Gin","St‑Germain","Sour","Shaken"],ingredients:["40 ml gin","25 ml St-Germain","20 ml suco de pepino","10 ml suco de limão","1 pitada de sal"],steps:["Bata tudo com gelo.","Coe duplo em coupe."],notes:"Floral + pepino = algo etéreo. Quase gelado mesmo sem gelo extra.",rating:0,servings:"1",custom:false},
  {name:"Flor Rubra",categories:["Cachaça Envelhecida","St‑Germain","Sour","Shaken"],ingredients:["40 ml cachaça envelhecida leve","20 ml St-Germain","30 ml morango macerado","10 ml suco de limão"],steps:["Macere os morangos na coqueteleira.","Adicione cachaça, St-Germain e limão com gelo.","Bata e coe duplo em coupe."],notes:"A cachaça traz corpo e calor, o St-Germain levanta o aroma.",rating:0,servings:"1",custom:false},
  {name:"Floral Mule Leve",categories:["Vodka","St‑Germain","Buck","Built"],ingredients:["40 ml vodka","20 ml St-Germain","10 ml suco de limão","ginger beer para completar"],steps:["Coloque gelo num copo alto.","Adicione vodka, St-Germain e limão.","Complete com ginger beer.","Receita de Ginger beer (caseira) disponível em Preparos Caseiros."],notes:"Menos doce que o Moscow Mule, mais perfumado. Ginger beer domina menos aqui.",rating:0,servings:"1",custom:false},

  // ── LUXARDO ──
  {name:"Tuxedo",categories:["Gin","Luxardo Maraschino","Absinto","Stirred"],ingredients:["45 ml gin","45 ml vermute seco","7 ml Maraschino","1 dash absinthe","casca de limão"],steps:["Mexa tudo com gelo.","Coe em coupe."],notes:"Dry Martini com camadas.",rating:0,servings:"",custom:false},
  {name:"Rose",categories:["Vodka","Luxardo Maraschino","Lillet","Shaken"],ingredients:["45 ml vodka","20 ml Lillet Blanc","10 ml Maraschino","casca de limão"],steps:["Mexa com gelo.","Coe em coupe."],notes:"Delicado e floral.",rating:0,servings:"",custom:false},

  // ── LICOR STREGA ──
  {name:"Strega Sour",categories:["Licor Strega","Sour","Shaken"],ingredients:["50 ml Strega","25 ml suco de limão","15 ml xarope simples","1 clara de ovo"],steps:["Dry shake.","Adicione gelo e agite.","Coe em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Herbal, floral e complexo.",rating:0,servings:"",custom:false},
  {name:"Strega Spritz",categories:["Espumante","Licor Strega","Spritz","Built"],ingredients:["40 ml Strega","80 ml prosecco","30 ml água com gás","casca de limão"],steps:["Combine em taça com gelo.","Decore com limão."],notes:"",rating:0,servings:"",custom:false},
  {name:"Italian Buck",categories:["Licor Strega","Buck","Highball","Built"],ingredients:["45 ml Strega","15 ml suco de limão","120 ml cerveja de gengibre","rodela de limão"],steps:["Combine em copo alto com gelo.","Mexa e decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Witch's Kiss",categories:["Licor Strega","Gin","Sour","Shaken"],ingredients:["30 ml gin","30 ml Strega","20 ml suco de limão","10 ml mel"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Benevento Old Fashioned",categories:["Whisky","Licor Strega","Stirred"],ingredients:["40 ml bourbon","15 ml Strega","1 dash Angostura","twist de laranja"],steps:["Combine tudo no copo baixo com gelo.","Mexa bem.","Expresse o twist de laranja."],notes:"O Strega entra como açúcar e tempero ao mesmo tempo.",rating:0,servings:"",custom:false},
  {name:"Golden Bee",categories:["Licor Strega","Sour","Shaken"],ingredients:["40 ml Strega","20 ml suco de limão","10 ml mel diluído","gelo"],steps:["Bata tudo com gelo.","Coe em coupe ou rocks."],notes:"Parece um chá gelado turbinado.",rating:0,servings:"",custom:false},
  {name:"Strega Martini",categories:["Gin","Licor Strega","Vermute seco","Stirred"],ingredients:["50 ml gin","10 ml Strega","10 ml vermouth seco"],steps:["Mexa tudo com gelo.","Sirva bem gelado em coupe."],notes:"O Strega entra como um temperinho secreto.",rating:0,servings:"",custom:false},
  {name:"Strega Coffee Flip",categories:["Licor Strega","Shaken"],ingredients:["30 ml Strega","30 ml café espresso","1 gema","10 ml açúcar"],steps:["Shake vigoroso com gelo.","Coe em coupe."],notes:"Quase um tiramisù líquido.",rating:0,servings:"",custom:false},
  {name:"Strega Highball",categories:["Licor Strega","Highball","Built"],ingredients:["50 ml Strega","soda","limão espremido","gelo"],steps:["Coloque gelo em copo alto.","Adicione o Strega.","Complete com soda e esprema o limão."],notes:"Ultra refrescante e simples.",rating:0,servings:"",custom:false},
  {name:"Giardino Giallo",categories:["Licor Strega","Sour","Shaken"],ingredients:["45 ml Strega","20 ml suco de limão siciliano","10 ml xarope de açúcar","4 folhas de manjericão","2 dashes de solução salina"],steps:["Macere levemente o manjericão.","Adicione os demais ingredientes com gelo.","Shake e coe duplo."],notes:"O sal abre as ervas e puxa o açafrão para frente.",rating:0,servings:"",custom:false},
  {name:"Zafferano Tonic",categories:["Licor Strega","Highball","Built"],ingredients:["50 ml Strega","água tônica","zest de limão siciliano","limão tahiti"],steps:["Monte direto no copo com gelo.","Complete com tônica.","Decore com zest."],notes:"Não é um gin tônica sem gin. É quase um chá gaseificado alcoólico.",rating:0,servings:"",custom:false},
  {name:"Ervas & Casca",categories:["Licor Strega","Shaken"],ingredients:["40 ml Strega","30 ml suco de laranja fresco","5 ml xarope de açúcar","1 dash Angostura"],steps:["Shake tudo com gelo.","Coe em copo ou coupe."],notes:"Trabalha mais casca de fruta do que suco doce.",rating:0,servings:"",custom:false},
  {name:"Campo Noturno",categories:["Licor Strega","Stirred"],ingredients:["40 ml Strega","30 ml chá de camomila forte (frio)","10 ml mel","2 gotas de solução salina"],steps:["Shake leve ou mexa com gelo.","Coe em coupe."],notes:"Parece uma infusão noturna que resolveu sair de casa.",rating:0,servings:"",custom:false},
  {name:"Ouro & Fumaça",categories:["Licor Strega","Sour","Shaken"],ingredients:["45 ml Strega","15 ml suco de limão","10 ml mel","ramo de alecrim queimado (para defumação)"],steps:["Shake tudo com gelo.","Sirva no copo.","Capture a fumaça do alecrim queimado no copo antes de servir."],notes:"O alecrim conversa direto com as ervas do licor.",rating:0,servings:"",custom:false},
  {name:"Freddo di Benevento",categories:["Licor Strega","Built"],ingredients:["60 ml Strega","gelo grande","casca de limão siciliano"],steps:["Coloque o gelo no copo.","Adicione o Strega.","Torça a casca de limão e sirva."],notes:"Quando o ingrediente é bom, às vezes menos é mais.",rating:0,servings:"",custom:false},
  {name:"Fruto Secreto",categories:["Licor Strega","Shaken"],ingredients:["40 ml Strega","30 ml suco de pera","10 ml suco de limão","5 ml mel"],steps:["Shake tudo com gelo.","Coe em coupe."],notes:"Pera + ervas = combinação que parece óbvia, mas quase ninguém usa.",rating:0,servings:"",custom:false},
  {name:"Golden Orchard",categories:["Licor Strega","Vodka","Collins","Built"],ingredients:["40 ml Strega","30 ml vodka","25 ml suco de maçã verde coado","10 ml suco de limão siciliano","2 dashes bitters de aipo","soda para completar","fatia fina de maçã + hortelã"],steps:["Coloque gelo num copo alto.","Adicione Strega, vodka, maçã, limão e bitters.","Complete com soda.","Decore com maçã e hortelã."],notes:"O Strega vira um temperinho botânico pra maçã — quase suco de feira gourmet.",rating:0,servings:"1",custom:false},
  {name:"Noite em Benevento",categories:["Licor Strega","Averna","Stirred"],ingredients:["30 ml Strega","30 ml Averna","20 ml cold brew concentrado","5 ml xarope de açúcar mascavo","1 dash Angostura","casca de laranja tostada"],steps:["Mexa tudo com gelo.","Coe em copo baixo com gelo grande.","Decore com casca de laranja tostada."],notes:"Meio sobremesa, meio digestivo. Aquela vibe de último drink da noite.",rating:0,servings:"1",custom:false},
  {name:"Citrus Incantation",categories:["Licor Strega","Triple Sec","Sour","Shaken"],ingredients:["35 ml Strega","20 ml Cointreau","25 ml suco de laranja","10 ml suco de limão","1 pitada de sal"],steps:["Bata tudo com gelo.","Coe em coupe ou rocks com gelo."],notes:"O sal puxa o lado herbal e evita que vire suquinho doce.",rating:0,servings:"1",custom:false},
  {name:"Campo Alto",categories:["Licor Strega","Gin","Sour","Shaken"],ingredients:["40 ml Strega","20 ml gin","15 ml suco de pepino","10 ml suco de limão","5 ml xarope simples","1 dash bitters aromático"],steps:["Bata tudo com gelo.","Coe duplo em coupe.","Decore com pepino.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Parece um jardim depois da chuva. Funciona muito bem no calor.",rating:0,servings:"1",custom:false},
  {name:"Tropical Esotérico",categories:["Licor Strega","Rum Envelhecido","Sour","Shaken"],ingredients:["35 ml Strega","30 ml rum envelhecido","30 ml suco de abacaxi fresco","10 ml suco de limão","5 ml mel"],steps:["Bata tudo com gelo.","Coe em coupe.","Decore com folha de abacaxi e noz-moscada."],notes:"O Strega dá profundidade onde normalmente só teria doçura.",rating:0,servings:"1",custom:false},
  {name:"Strega & Tonic Verde",categories:["Licor Strega","Highball","Built"],ingredients:["45 ml Strega","água tônica","1 fatia de pepino","hortelã"],steps:["Coloque gelo num copo alto.","Adicione o Strega.","Complete com tônica.","Decore com pepino e hortelã."],notes:"Pepino puxa o lado botânico e tira o risco de ficar doce demais.",rating:0,servings:"1",custom:false},
  {name:"Golden Orange Fizz",categories:["Licor Strega","Highball","Built"],ingredients:["40 ml Strega","40 ml suco de laranja","soda para completar","1 pitada de sal"],steps:["Coloque gelo num copo alto.","Adicione Strega e laranja.","Complete com soda.","Pitada de sal por cima."],notes:"O sal faz mágica aqui — realça o açafrão do Strega.",rating:0,servings:"1",custom:false},
  {name:"Alpine Highball",categories:["Licor Strega","Gin","Highball","Built"],ingredients:["30 ml Strega","30 ml gin","água tônica","zest de limão + tomilho"],steps:["Coloque gelo num copo alto.","Adicione Strega e gin.","Complete com tônica.","Decore com zest e tomilho."],notes:"Meio caminho entre G&T e algo completamente novo.",rating:0,servings:"1",custom:false},
  {name:"Floral Witch",categories:["Licor Strega","St‑Germain","Highball","Built"],ingredients:["30 ml Strega","15 ml St-Germain","soda para completar","flor comestível ou hortelã"],steps:["Coloque gelo num copo alto.","Adicione Strega e St-Germain.","Complete com soda e decore."],notes:"Vai pro lado delicado, quase perfume líquido. Dois florais que se potencializam.",rating:0,servings:"1",custom:false},
  {name:"Bitter Sunshine",categories:["Licor Strega","Aperol","Spritz","Built"],ingredients:["30 ml Strega","30 ml Aperol","soda para completar","rodela de laranja"],steps:["Coloque gelo num copo largo.","Adicione Strega e Aperol.","Complete com soda e decore com laranja."],notes:"Spritz sem espumante — mais seco e direto. O Strega adiciona profundidade que o Aperol não tem sozinho.",rating:0,servings:"1",custom:false},

  // ── JEREZ / SHERRY ──
  {name:"Bamboo",categories:["Jerez","Vermute seco","Stirred"],ingredients:["45 ml Fino Sherry","45 ml vermute seco","2 dash Orange Bitters","1 dash Angostura","casca de limão"],steps:["Mexa tudo com gelo.","Coe em coupe."],notes:"Baixo teor alcoólico, complexo.",rating:0,servings:"",custom:false},
  {name:"Adonis",categories:["Jerez","Vermute seco","Stirred"],ingredients:["60 ml Fino Sherry","30 ml vermute doce","1 dash Orange Bitters","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em coupe.","Expresse a casca de laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Sherry Cobbler",categories:["Jerez","Built"],ingredients:["90 ml Amontillado Sherry","15 ml xarope de laranja","15 ml suco de limão","gelo britado","frutas da estação"],steps:["Combine sherry, xarope e limão.","Sirva em copo com gelo britado.","Decore com frutas."],notes:"Um dos coquetéis mais antigos.",rating:0,servings:"",custom:false},
  {name:"Rebujito",categories:["Jerez","Highball","Built"],ingredients:["60 ml Fino Sherry","180 ml limonada ou 7UP","hortelã fresca","gelo"],steps:["Combine em copo alto com gelo.","Adicione hortelã."],notes:"Bebida festiva da Andaluzia.",rating:0,servings:"",custom:false},
  {name:"Tío Pepe & Tônica",categories:["Jerez","Highball","Built"],ingredients:["60 ml Fino Sherry (Tío Pepe)","120 ml água tônica","casca de limão","azeitona verde"],steps:["Encha taça balão com gelo.","Adicione o sherry.","Complete com tônica. Decore."],notes:"Muito popular em Sevilha e Londres.",rating:0,servings:"",custom:false},
  {name:"Sherry Highball",categories:["Jerez","Highball","Built"],ingredients:["60 ml Jerez (Fino ou Manzanilla)","soda","limão siciliano","gelo"],steps:["Coloque gelo em copo highball.","Adicione o sherry.","Complete com soda e esprema o limão."],notes:"Tipo um vinho branco com gás... só que mais interessante.",rating:0,servings:"",custom:false},
  {name:"Sherry Sour",categories:["Jerez","Sour","Shaken"],ingredients:["60 ml Jerez Amontillado","25 ml suco de limão","15 ml xarope simples","clara de ovo (opcional)"],steps:["Dry shake se usar clara.","Adicione gelo e agite.","Coe em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Mais leve que um Whisky Sour, mas elegante.",rating:0,servings:"",custom:false},
  {name:"East India Sour",categories:["Jerez","Sour","Shaken"],ingredients:["50 ml Jerez Oloroso ou estilo doce","20 ml suco de limão","10 ml açúcar"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Já puxa para sobremesa.",rating:0,servings:"",custom:false},
  {name:"Sherry Old Fashioned",categories:["Jerez","Stirred"],ingredients:["60 ml Jerez Oloroso","1 colher de chá de açúcar","bitters a gosto"],steps:["Dissolva o açúcar com o bitters.","Adicione o sherry e gelo.","Mexa bem e sirva no copo baixo."],notes:"Surpreende quem acha que sherry é leve demais.",rating:0,servings:"",custom:false},
  {name:"Coronation Cocktail",categories:["Jerez","Licor","Stirred"],ingredients:["40 ml Jerez","20 ml licor de laranja","bitters a gosto"],steps:["Mexa tudo com gelo.","Coe em coupe."],notes:"Clássico meio esquecido, mas muito bom.",rating:0,servings:"",custom:false},

  // ── AVERNA ──
  {name:"Bosco Notturno",categories:["Averna","Highball","Built"],ingredients:["45 ml Averna","10 ml suco de limão siciliano","60 ml água com gás","1 colher (chá) mel diluído (1:1)","casca de limão + ramo de alecrim"],steps:["Coloque Averna, limão e mel num copo alto com gelo.","Complete com água com gás.","Mexa suavemente e decore com casca de limão e alecrim."],notes:"O alecrim dá um aroma de floresta depois da chuva — herbal, profundo e refrescante.",rating:0,servings:"1",custom:false},
  {name:"Caramello Spritz",categories:["Averna","Espumante","Spritz","Built"],ingredients:["50 ml Averna","80 ml espumante brut","20 ml soda de laranja (ou água com gás + twist de laranja)","1 fatia de laranja"],steps:["Coloque gelo generoso numa taça de vinho.","Adicione o Averna.","Complete com espumante e soda de laranja.","Decore com fatia de laranja."],notes:"Lembra um Aperol Spritz que cresceu e começou a pagar boletos. Mais escuro, mais seco, mais adulto.",rating:0,servings:"1",custom:false},
  {name:"Nero Fizz",categories:["Averna","Fizz","Shaken"],ingredients:["45 ml Averna","20 ml suco de limão","15 ml xarope simples","1 clara de ovo","soda para completar"],steps:["Dry shake todos os ingredientes sem gelo por 15s.","Adicione gelo e agite novamente por 10s.","Coe em copo alto e complete devagar com soda.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Textura cremosa com amargor elegante. A espuma de clara contrasta bonito com a cor escura do Averna.",rating:0,servings:"1",custom:false},
  {name:"Sicilian Orchard",categories:["Averna","Sour","Shaken"],ingredients:["40 ml Averna","20 ml suco de maçã clarificado (ou integral bom)","10 ml suco de limão","5 ml maple syrup (ou mel leve)","pitada de canela"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem por 12s.","Coe duplo em coupe.","Finalize com pitada de canela."],notes:"Frutado escuro, quase sobremesa. Maçã assada + ervas. Parece outono engarrafado.",rating:0,servings:"1",custom:false},
  {name:"Amaro Tonic Café",categories:["Averna","Highball","Built"],ingredients:["50 ml Averna","80 ml água tônica","20 ml café cold brew","casca de laranja"],steps:["Coloque gelo num copo alto.","Adicione Averna e cold brew.","Complete com água tônica.","Expresse a casca de laranja sobre o drink e decore."],notes:"Amaro + tostado + refrescante. Funciona melhor do que parece no papel.",rating:0,servings:"1",custom:false},
  {name:"Dark Tropic",categories:["Averna","Sour","Shaken"],ingredients:["45 ml Averna","30 ml suco de abacaxi","10 ml suco de limão tahiti","5 ml xarope de gengibre"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem por 12s.","Coe em copo baixo com gelo.","Receita de Xarope de Gengibre disponível em Preparos Caseiros."],notes:"Tropical, mas com sombra. Nada de drink solar demais — o Averna ancora tudo.",rating:0,servings:"1",custom:false},

  // ── ABSINTO ──
  {name:"Jardim Noturno",categories:["Absinto","St‑Germain","Highball","Built"],ingredients:["30 ml absinto","20 ml St-Germain","10 ml xarope de mel (1:1)","15 ml suco de limão siciliano","água com gás para completar"],steps:["Coloque gelo num copo alto.","Adicione absinto, St-Germain, mel e limão.","Complete com água com gás e mexa suavemente.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"Floral + anis + doçura leve. Parece um jardim depois da chuva.",rating:0,servings:"1",custom:false},
  {name:"Maçã Verde Elétrica",categories:["Absinto","Highball","Built"],ingredients:["25 ml absinto","40 ml suco de maçã verde clarificado (ou integral bom)","10 ml suco de limão","5 ml xarope simples","soda para completar"],steps:["Coloque gelo num copo alto.","Adicione absinto, maçã, limão e xarope.","Complete com soda.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Lembra bala verde adulta, com fundo herbal intrigante.",rating:0,servings:"1",custom:false},
  {name:"Fennel Tonic",categories:["Absinto","Highball","Built"],ingredients:["30 ml absinto","água tônica","1 fatia de pepino","1 ramo de erva-doce ou dill"],steps:["Highball com gelo.","Adicione o absinto.","Complete com tônica e decore com pepino e erva-doce."],notes:"Seco, aromático, quase medicinal — mas do jeito bom.",rating:0,servings:"1",custom:false},
  {name:"Solar Verde",categories:["Absinto","Highball","Built"],ingredients:["25 ml absinto","30 ml suco de laranja","10 ml suco de limão","10 ml xarope de açúcar","1 pitada de sal","soda para completar"],steps:["Coloque gelo num copo alto.","Adicione todos os ingredientes menos a soda.","Complete com soda."],notes:"Quase tropical, mas com personalidade forte. O sal equilibra o anis.",rating:0,servings:"1",custom:false},
  {name:"Vinha Fantasma",categories:["Absinto","Highball","Built"],ingredients:["30 ml absinto","40 ml suco de uva integral","10 ml suco de limão","5 ml xarope de açúcar","água com gás para completar"],steps:["Coloque gelo num copo alto.","Adicione absinto, uva, limão e xarope.","Complete com água com gás."],notes:"Lembra vinho jovem com um twist herbal. Inesperadamente sofisticado.",rating:0,servings:"1",custom:false},
  {name:"Mate Verde",categories:["Absinto","Highball","Built"],ingredients:["25 ml absinto","40 ml chá mate gelado forte","10 ml suco de limão","10 ml mel","soda para completar"],steps:["Dissolva o mel no limão.","Adicione absinto, mate e a mistura num copo alto com gelo.","Complete com soda."],notes:"Brasil encontra Belle Époque. Refrescante, levemente terroso, muito bebível.",rating:0,servings:"1",custom:false},
  {name:"Abacaxi Anisado",categories:["Absinto","Highball","Built"],ingredients:["25 ml absinto","40 ml suco de abacaxi","10 ml suco de limão","10 ml xarope de açúcar demerara","2 gotas de solução salina","água com gás para completar"],steps:["Coloque gelo num copo alto.","Adicione todos os ingredientes menos a soda.","Complete com água com gás."],notes:"Abacaxi brilha, absinto sustenta — não vira sobremesa.",rating:0,servings:"1",custom:false},
  {name:"Green Shandy",categories:["Absinto","Beer Highballs","Built"],ingredients:["20 ml absinto","100 ml cerveja de trigo (tipo Weiss ou similar)","10 ml suco de limão"],steps:["Coloque gelo leve num copo alto.","Adicione absinto e limão.","Complete delicadamente com a cerveja."],notes:"Cítrico, aromático e surpreendentemente equilibrado. Leve e divertido.",rating:0,servings:"1",custom:false},

  // ── FERNET ──
  {name:"Fernet & Coke",categories:["Fernet","Highball","Built"],ingredients:["50 ml Fernet-Branca","150 ml Coca-Cola","gelo","rodela de limão"],steps:["Encha copo com gelo.","Adicione Fernet e Coca-Cola.","Mexa levemente."],notes:"El clásico argentino.",rating:0,servings:"",custom:false},
  {name:"Industry Sour",categories:["Fernet","Gin","Sour","Shaken"],ingredients:["30 ml Fernet-Branca","30 ml gin","30 ml suco de limão","20 ml xarope simples"],steps:["Bata tudo com gelo.","Coe em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Favorito de bartenders.",rating:0,servings:"",custom:false},

  // ── PORTO ──
  {name:"Porto Tônico Tinto",categories:["Porto","Highball","Built"],ingredients:["60 ml Porto Tinto","120 ml água tônica","casca de laranja","gelo"],steps:["Encha taça balão com gelo.","Adicione o Porto.","Complete com tônica e decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Porto Flip",categories:["Porto","Shaken"],ingredients:["60 ml Porto Tinto","10 ml conhaque","1 ovo inteiro","noz-moscada"],steps:["Bata tudo com gelo vigorosamente.","Coe em coupe.","Finalize com noz-moscada."],notes:"Clássico vitoriano.",rating:0,servings:"",custom:false},
  {name:"Porto Negroni",categories:["Porto","Campari","Stirred"],ingredients:["30 ml Porto Tinto","30 ml Campari","30 ml gin","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo.","Expresse a casca de laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Porto Branco & Tônica",categories:["Porto","Highball","Built"],ingredients:["60 ml Porto Branco","120 ml água tônica","rodela de limão","hortelã","gelo"],steps:["Encha taça balão com gelo.","Adicione Porto Branco.","Complete com tônica e decore."],notes:"O clássico de Douro no verão.",rating:0,servings:"",custom:false},
  {name:"Porto Branco Sour",categories:["Porto","Sour","Shaken"],ingredients:["60 ml Porto Branco","25 ml suco de limão","15 ml xarope simples","1 clara de ovo"],steps:["Dry shake.","Adicione gelo e agite.","Coe em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Porto Branco Spritz",categories:["Espumante","Porto","Spritz","Built"],ingredients:["40 ml Porto Branco","60 ml prosecco","30 ml água com gás","casca de limão"],steps:["Combine em taça com gelo.","Decore com limão."],notes:"",rating:0,servings:"",custom:false},

  // ── LILLET ──
  {name:"Lillet Vive",categories:["Lillet","Highball","Built"],ingredients:["50 ml Lillet Blanc","100 ml água tônica","rodelas de pepino","morango ou hortelã"],steps:["Copo com gelo.","Adicione o Lillet.","Complete com tônica.","Mexa levemente e decore com pepino e hortelã."],notes:"Refrescância absurda. Parece uma brisa com sotaque francês.",rating:0,servings:"1",custom:false},
  {name:"Lillet Berry",categories:["Lillet","Smash","Built"],ingredients:["50 ml Lillet Blanc","frutas vermelhas","80 ml água com gás ou tônica","hortelã"],steps:["Macere levemente as frutas.","Adicione gelo.","Adicione o Lillet e complete com água com gás.","Decore com hortelã."],notes:"Fica com cara de sobremesa líquida, mas ainda adulto.",rating:0,servings:"1",custom:false},
  {name:"Lillet & Gin Highball",categories:["Gin","Lillet","Highball","Built"],ingredients:["30 ml gin","50 ml Lillet Blanc","água com gás","limão"],steps:["Highball com gelo.","Adicione gin e Lillet.","Complete com água com gás.","Finalize com zest de limão."],notes:"Meio caminho entre um gin tônica e algo mais aromático.",rating:0,servings:"1",custom:false},
  {name:"Lillet Honey Lemon",categories:["Lillet","Highball","Built"],ingredients:["50 ml Lillet Blanc","10 ml mel","20 ml suco de limão","água com gás"],steps:["Dissolva o mel no limão.","Adicione gelo.","Adicione o Lillet.","Complete com água com gás."],notes:"Um azedinho elegante, quase medicinal... no bom sentido.",rating:0,servings:"1",custom:false},
  {name:"White Negroni Tropical",categories:["Gin","Lillet","Cynar","Luxardo Maraschino","Stirred"],ingredients:["30 ml gin","30 ml Lillet Blanc","20 ml Cynar","5 ml Luxardo"],steps:["Mexa todos os ingredientes com gelo.","Coe em rocks com gelo.","Decore com casca de laranja."],notes:"Perfil: amargo elegante + leve dulçor + herbal profundo. O Cynar puxa pro vegetal, o Luxardo dá aquele eco doce no fundo.",rating:0,servings:"1",custom:false},
  {name:"Lillet Garden Spritz",categories:["Lillet","St‑Germain","Spritz","Built"],ingredients:["40 ml Lillet Blanc","20 ml St-Germain","água com gás","hortelã ou limão"],steps:["Copo com gelo.","Adicione Lillet e St-Germain.","Complete com água com gás.","Decore com hortelã ou limão."],notes:"Perfil: floral, leve, perigoso de fácil. Isso aqui some no copo. Cuidado.",rating:0,servings:"1",custom:false},
  {name:"Cynar Sunset Highball",categories:["Lillet","Cynar","Highball","Built"],ingredients:["40 ml Lillet Blanc","20 ml Cynar","água com gás","casca de laranja"],steps:["Highball com gelo.","Adicione Lillet e Cynar.","Complete com água com gás.","Expresse a casca de laranja."],notes:"Perfil: refrescante com final amargo adulto. Parece leve... até você perceber que ele tem personalidade.",rating:0,servings:"1",custom:false},
  {name:"French Aviation (hack)",categories:["Gin","Lillet","Luxardo Maraschino","Sour","Shaken"],ingredients:["45 ml gin","20 ml Lillet Blanc","10 ml Luxardo","15 ml limão"],steps:["Agite tudo com gelo.","Coe em coupe gelada."],notes:"Perfil: cítrico, levemente doce, super equilibrado. Sem violeta, mas com mais profundidade. Funciona muito.",rating:0,servings:"1",custom:false},
  {name:"Lillet Orchard",categories:["Lillet","Sour","Shaken"],ingredients:["50 ml Lillet Blanc","10 ml mel","15 ml limão","1 dash Angostura"],steps:["Dissolva o mel com o limão.","Agite com gelo.","Coe em coupe.","Pingue o Angostura."],notes:"Perfil: cítrico + mel + especiaria leve. Tem cara de drink de hotel caro que você tenta recriar depois.",rating:0,servings:"1",custom:false},
  {name:"Almost Martini",categories:["Gin","Lillet","Vermute Bianco","Stirred"],ingredients:["50 ml gin","25 ml Lillet Blanc","10 ml Vermute branco"],steps:["Mexa todos os ingredientes com gelo.","Coe em taça gelada."],notes:"Perfil: entre Martini e algo mais aromático. Mais acessível que um Martini clássico, menos agressivo.",rating:0,servings:"1",custom:false},
  {name:"Horta & Laranja Queimada",categories:["Lillet","Cynar","Sour","Shaken"],ingredients:["50 ml Lillet Blanc","20 ml Cynar","10 ml suco de limão siciliano","5 ml mel","1 ramo de alecrim","casca de laranja"],steps:["Dissolva o mel no limão.","Adicione Lillet, Cynar e gelo.","Mexa bem (ou bata leve).","Coe para um copo baixo com gelo.","Finalize com casca de laranja queimada e alecrim batido na mão."],notes:"Herbáceo, cítrico e levemente amargo. A laranja queimada é o toque que transforma.",rating:0,servings:"1",custom:false},
  {name:"Lillet Gold Rush",categories:["Gin","Lillet","Sour","Shaken"],ingredients:["40 ml Lillet Blanc","20 ml gin","15 ml suco de limão siciliano","10 ml mel","1 dash de Angostura (opcional)"],steps:["Dissolva o mel no limão.","Adicione gin, Lillet e gelo.","Bata bem.","Coe para um copo baixo ou taça.","Finalize com casca de limão."],notes:"Começa doce e cítrico, abre floral com o Lillet e fecha levemente seco com o gin. Familiar, mas fora do eixo.",rating:0,servings:"1",custom:false},
  {name:"White Orchard Martini",categories:["Gin","Lillet","St‑Germain","Stirred"],ingredients:["50 ml gin","25 ml Lillet Blanc","10 ml St-Germain","twist de limão ou maçã (opcional)"],steps:["Mexa todos os ingredientes com gelo.","Coe em taça gelada.","Finalize com zest."],notes:"Floral elegante, levemente frutado — quase maçã verde. Muito mais interessante que um Martini clássico.",rating:0,servings:"1",custom:false},
  {name:"Solar Highball",categories:["Lillet","Highball","Built"],ingredients:["50 ml Lillet Blanc","20 ml suco de laranja","5 ml limão siciliano","água com gás","casca de laranja"],steps:["Copo alto com gelo.","Adicione todos os ingredientes.","Mexa leve.","Decore com casca de laranja."],notes:"Lembra suco de laranja... até você perceber que não é. Mais adulto, mais seco, mais interessante.",rating:0,servings:"1",custom:false},
  {name:"Lillet Spritz",categories:["Lillet","Espumante","Spritz","Built"],ingredients:["60 ml Lillet Blanc","90 ml prosecco","30 ml água com gás","rodela de laranja"],steps:["Combine em taça de vinho com gelo.","Decore com laranja."],notes:"Leve, floral e refrescante.",rating:0,servings:"",custom:false},
  {name:"French Pearl",categories:["Gin","Lillet","Absinto","Sour","Shaken"],ingredients:["45 ml gin","20 ml Lillet Blanc","20 ml suco de limão","6 folhas de hortelã","1 dash absinthe"],steps:["Macere levemente a hortelã.","Adicione os demais ingredientes com gelo.","Bata e coe duplo em coupe."],notes:"Floral, cítrico e com frescor mentolado.",rating:0,servings:"",custom:false},
  {name:"Lillet & Tônica",categories:["Lillet","Highball","Built"],ingredients:["60 ml Lillet Blanc","120 ml água tônica","rodela de laranja","gelo"],steps:["Encha taça balão com gelo.","Adicione o Lillet.","Complete com tônica e decore."],notes:"O mais simples e elegante dos aperitivos.",rating:0,servings:"",custom:false},
  {name:"Jasmine",categories:["Gin","Campari","Lillet","Triple Sec","Sour","Shaken"],ingredients:["30 ml gin","15 ml Campari","15 ml Cointreau","15 ml suco de limão"],steps:["Bata tudo com gelo.","Coe em coupe."],notes:"Equilibrado — amargo, doce e cítrico ao mesmo tempo.",rating:0,servings:"",custom:false},
  {name:"Lillet Rosé Spritz",categories:["Lillet","Espumante","Spritz","Built"],ingredients:["50 ml Lillet Rosé","80 ml prosecco","30 ml água com gás","1 morango","gelo"],steps:["Combine em taça de vinho com gelo.","Decore com morango."],notes:"Mais frutado e delicado que o Lillet Blanc.",rating:0,servings:"",custom:false},

  // ── APERITIVO / AMARO ──
  {name:"Cynar Tônica",categories:["Cynar","Highball","Built"],ingredients:["50 ml Cynar","120 ml água tônica","rodela de laranja","gelo"],steps:["Encha taça balão com gelo.","Adicione Cynar.","Complete com tônica e decore."],notes:"Amargo e refrescante.",rating:0,servings:"",custom:false},
  {name:"Black Negroni",categories:["Gin","Fernet","Stirred"],ingredients:["30 ml gin","30 ml Fernet-Branca","30 ml vermute doce","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo."],notes:"Intenso e herbal.",rating:0,servings:"",custom:false},
  {name:"Fernet Sour",categories:["Fernet","Sour","Shaken"],ingredients:["45 ml Fernet-Branca","25 ml suco de limão","20 ml mel","1 clara de ovo"],steps:["Dry shake.","Adicione gelo e agite.","Coe em coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Fernet Ginger Highball",categories:["Fernet","Highball","Buck","Built"],ingredients:["40 ml fernet","ginger ale ou ginger beer","limão espremido","gelo"],steps:["Coloque gelo em copo highball.","Adicione o fernet.","Complete com ginger beer e esprema o limão.","Mexa suavemente.","Receita de Ginger beer (caseira) disponível em Preparos Caseiros."],notes:"Fresco, picante e muito equilibrado. Se você curte Cynar + ginger, vai gostar disso.",rating:0,servings:"",custom:false},
  {name:"Fernet Spritz",categories:["Fernet","Espumante","Spritz","Built"],ingredients:["30 ml fernet","60 ml espumante","30 ml soda","rodela de laranja","gelo"],steps:["Coloque gelo no copo.","Adicione o espumante, depois o fernet.","Complete com soda.","Decore com laranja."],notes:"Versão mais adulta de um spritz — amargo elegante no lugar do Aperol.",rating:0,servings:"",custom:false},

  // ── CAMPARI MODERNO ──
  {name:"Jardim Suspenso",categories:["Gin","Campari","Collins","Built"],ingredients:["40 ml Campari","20 ml gin","15 ml cordial de pepino (ou suco fresco)","10 ml suco de limão siciliano","soda para completar","folha de manjericão"],steps:["Esmague levemente o manjericão no copo.","Adicione gelo, Campari, gin, pepino e limão.","Complete com soda."],notes:"O Campari vira folha amarga em vez de casca cítrica. Verde e elegante.",rating:0,servings:"1",custom:false},
  {name:"Bitter Milk Punch",categories:["Campari","Sour","Shaken"],ingredients:["40 ml Campari","30 ml chá preto forte","20 ml suco de limão","15 ml mel","60 ml leite integral quente"],steps:["Misture Campari, chá, limão e mel.","Adicione o leite quente por último — vai talhar.","Aguarde 5 minutos e coe lentamente por filtro de café ou pano.","Sirva frio sobre gelo."],notes:"Clarificação com leite: o ácido torna o leite e o tanino coagulam, filtrando tudo. Resultado cristalino com amargor sofisticado escondido.",rating:0,servings:"1",custom:false},
  {name:"Vinho Fantasma",categories:["Campari","Vinho","Stirred"],ingredients:["30 ml Campari","40 ml vinho tinto leve","10 ml xarope de açúcar mascavo","1 dash bitters de chocolate","twist de laranja"],steps:["Mexa tudo com gelo.","Coe em copo baixo com gelo.","Expresse o twist de laranja."],notes:"Lembra vinho temperado de inverno, mas servido frio. O chocolate amplifica o amargor.",rating:0,servings:"1",custom:false},
  {name:"Rubor Picante",categories:["Tequila","Campari","Sour","Shaken"],ingredients:["40 ml Campari","20 ml tequila branca","15 ml suco de limão","10 ml xarope simples","1 rodela fina de pimenta dedo-de-moça"],steps:["Bata todos os ingredientes com gelo.","Coe fino em coupe.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Picante puxa o amargo para frente — um bitter spicy margarita que nunca existiu.",rating:0,servings:"1",custom:false},
  {name:"Espresso Amaro Highball",categories:["Campari","Highball","Built"],ingredients:["30 ml Campari","30 ml café cold brew","10 ml xarope de açúcar","água com gás para completar"],steps:["Coloque gelo num copo alto.","Adicione Campari, cold brew e xarope.","Complete com água com gás."],notes:"Café tônico mais adulto, com amargor em camadas.",rating:0,servings:"1",custom:false},
  {name:"Casca & Fumaça",categories:["Mezcal","Campari","Stirred"],ingredients:["40 ml Campari","20 ml mezcal","10 ml licor de laranja seco","1 dash Angostura","casca de laranja"],steps:["Mexa tudo com gelo.","Coe em rocks.","Flambear a casca de laranja por cima."],notes:"Amargo + defumado + cítrico seco = super gastronômico.",rating:0,servings:"1",custom:false},
  {name:"Bitter & Melão",categories:["Vodka","Campari","Sour","Shaken"],ingredients:["35 ml Campari","25 ml vodka","20 ml suco de melão","10 ml xarope de mel"],steps:["Bata tudo com gelo.","Coe em coupe ou rocks gelado.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"O melão suaviza sem apagar o amargor. Perigosamente fácil de beber.",rating:0,servings:"1",custom:false},
  {name:"Campari Lemon Tonic",categories:["Campari","Highball","Built"],ingredients:["40 ml Campari","10 ml suco de limão siciliano","80 ml água tônica","casca de limão"],steps:["Coloque gelo num copo alto.","Adicione Campari e limão.","Complete com tônica.","Esprema e coloque a casca de limão."],notes:"Menos doce que parece, mais elegante do que entrega.",rating:0,servings:"1",custom:false},
  {name:"Laranja & Sal",categories:["Campari","Highball","Built"],ingredients:["40 ml Campari","20 ml suco de laranja","soda para completar","1 pitada mínima de sal"],steps:["Coloque gelo num copo alto.","Adicione Campari e laranja.","Complete com soda.","Pitada de sal por cima."],notes:"O sal liga o doce e o amargo como cola invisível.",rating:0,servings:"1",custom:false},
  {name:"Highball Picante",categories:["Campari","Highball","Built"],ingredients:["40 ml Campari","10 ml xarope simples","10 ml suco de limão","2 fatias de pimenta fresca","soda para completar"],steps:["Macere levemente a pimenta no fundo do copo.","Adicione gelo, Campari, xarope e limão.","Complete com soda.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O picante empurra o Campari para frente sem agredir.",rating:0,servings:"1",custom:false},
  {name:"Uva Amarga",categories:["Campari","Highball","Built"],ingredients:["35 ml Campari","40 ml suco de uva integral","soda para completar"],steps:["Coloque gelo num copo alto.","Adicione Campari e uva.","Complete com soda e sirva bem gelado."],notes:"Lembra vinho leve, mas com final mais seco. Quase, mas não é vinho.",rating:0,servings:"1",custom:false},
  {name:"Bitter Ginger Highball",categories:["Campari","Buck","Built"],ingredients:["40 ml Campari","90 ml ginger beer","5 ml suco de limão"],steps:["Coloque gelo grande num copo alto.","Adicione Campari e limão.","Complete com ginger beer.","Receita de Ginger beer (caseira) disponível em Preparos Caseiros."],notes:"Gengibre abraça o amargor e não larga mais. Um dos melhores combos simples do Campari.",rating:0,servings:"1",custom:false},
  {name:"Verde & Amargo",categories:["Campari","Highball","Built"],ingredients:["35 ml Campari","20 ml suco de maçã verde","soda para completar","folha de hortelã ou sálvia"],steps:["Coloque gelo num copo alto.","Adicione Campari e maçã.","Complete com soda e decore com erva."],notes:"Ácido, leve, meio inesperado. A maçã verde puxa o lado mais fresco do Campari.",rating:0,servings:"1",custom:false},
  {name:"Tomate Highball",categories:["Campari","Highball","Built"],ingredients:["30 ml Campari","50 ml suco de tomate leve","soda para completar","1 gota de molho inglês (opcional)"],steps:["Coloque gelo num copo alto.","Adicione Campari, tomate e molho inglês.","Mexa suavemente.","Complete com soda."],notes:"Primo distante do Bloody Mary que decidiu virar verão. Funciona absurdamente bem.",rating:0,servings:"1",custom:false},

  // ── VINHO / FORTIFICADO ──
  {name:"Sangria",categories:["Vinho","Triple Sec","Built"],ingredients:["750 ml vinho tinto","100 ml brandy","50 ml Cointreau","200 ml suco de laranja","frutas cortadas","xarope a gosto"],steps:["Misture tudo e refrigere por 4h.","Sirva em copo com gelo e frutas."],notes:"",rating:0,servings:"6",custom:false},

  // ── SEM ÁLCOOL ──
  {name:"Virgin Mojito",categories:["Não alcóolicos","Smash","Built"],ingredients:["8 folhas de hortelã","30 ml suco de limão","20 ml xarope simples","150 ml água com gás","gelo"],steps:["Macere a hortelã com limão e xarope.","Adicione gelo e complete com água com gás.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Shirley Temple",categories:["Não alcóolicos","Highball","Built"],ingredients:["150 ml ginger ale","50 ml suco de laranja","20 ml grenadine","cereja e laranja para decorar"],steps:["Combine em copo alto com gelo.","Adicione grenadine por cima.","Decore.","Receita de Grenadine Caseira disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Arnold Palmer",categories:["Não alcóolicos","Highball","Built"],ingredients:["150 ml chá preto gelado","150 ml limonada","gelo","rodela de limão"],steps:["Combine em copo alto com gelo.","Mexa suavemente."],notes:"Metade chá, metade limonada.",rating:0,servings:"",custom:false},
  {name:"Hibiscus Fizz",categories:["Não alcóolicos","Fizz","Built"],ingredients:["60 ml chá de hibisco concentrado","15 ml suco de limão","10 ml xarope simples","150 ml água com gás","gelo"],steps:["Combine chá, limão e xarope em copo com gelo.","Complete com água com gás.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Cucumber Cooler",categories:["Não alcóolicos","Highball","Built"],ingredients:["60 ml suco de pepino","20 ml suco de limão","15 ml xarope de hortelã","150 ml água tônica","gelo"],steps:["Combine pepino, limão e xarope em copo com gelo.","Complete com tônica.","Receita de Xarope de Hortelã disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Água de Coco Spritz",categories:["Não alcóolicos","Spritz","Built"],ingredients:["120 ml água de coco","60 ml suco de abacaxi","15 ml suco de limão","60 ml água com gás","gelo"],steps:["Combine tudo em copo alto com gelo.","Mexa delicadamente."],notes:"",rating:0,servings:"",custom:false},
  {name:"Virgin Margarita",categories:["Não alcóolicos","Sour","Shaken"],ingredients:["60 ml suco de limão","30 ml xarope de agave","30 ml suco de laranja","sal na borda"],steps:["Bata tudo com gelo.","Coe em copo com borda salgada.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Ginger Lemonade",categories:["Não alcóolicos","Highball","Built"],ingredients:["20 ml xarope de gengibre","30 ml suco de limão","150 ml água com gás","rodela de limão","gelo"],steps:["Combine xarope e limão em copo com gelo.","Complete com água com gás.","Receita de Xarope de Gengibre disponível em Preparos Caseiros."],notes:"",rating:0,servings:"",custom:false},
  {name:"Shrub de Frutas Vermelhas",categories:["Não alcóolicos","Highball","Built"],ingredients:["40 ml shrub de frutas vermelhas (vinagre + fruta + açúcar)","150 ml água com gás","gelo","frutas para decorar"],steps:["Combine shrub e água com gás em copo com gás com gelo.","Decore com frutas."],notes:"Shrub: macere 1:1:1 fruta, açúcar, vinagre de maçã por 24h.",rating:0,servings:"",custom:false},
  // ── CORDIAL COCKTAILS ──
  {name:"Solar Fizz",categories:["Vodka","Highball","Built"],ingredients:["50 ml vodka","35 ml cordial cítrico clarificado","soda para completar","gelo"],steps:["Coloque gelo num copo alto.","Adicione vodka e cordial.","Complete com soda bem gelada."],notes:"Parece água com gás... até não ser. A clarificação deixa o cordial cristalino e a acidez polida.",rating:0,servings:"1",custom:false},
  {name:"Jardim Alto",categories:["Gin","Collins","Built"],ingredients:["50 ml gin","30 ml cordial verde (hortelã + manjericão)","10 ml suco de limão","água com gás para completar"],steps:["Coloque gelo num copo alto.","Adicione gin, cordial e limão.","Complete com água com gás e mexa suavemente.","Receita de Cordial Verde disponível em Preparos Caseiros."],notes:"Cheiro de horta depois da chuva. O cordial verde faz todo o trabalho aromático.",rating:0,servings:"1",custom:false},
  {name:"Trópico Seco",categories:["Rum Envelhecido","Stirred"],ingredients:["50 ml rum ouro","35 ml cordial de abacaxi especiado","2 dashes Angostura","gelo grande"],steps:["Combine rum, cordial e bitters no copo com gelo grande.","Mexa suavemente por 20s.","Sirva no mesmo copo.","Receita de Cordial de Abacaxi com Especiarias disponível em Preparos Caseiros."],notes:"Lembra tiki... mas de camisa social. As especiarias do cordial ancoram o abacaxi.",rating:0,servings:"1",custom:false},
  {name:"Rubi Tônico",categories:["Gin","Highball","Built"],ingredients:["45 ml gin","30 ml cordial de frutas vermelhas","água tônica para completar"],steps:["Coloque gelo num copo alto.","Adicione gin e cordial.","Complete com tônica e mexa suavemente.","Receita de Cordial de Frutas Vermelhas com Chá disponível em Preparos Caseiros."],notes:"Tipo um vinho que virou highball. O cordial dá cor e acidez sem perder elegância.",rating:0,servings:"1",custom:false},
  {name:"Linha Clara",categories:["Tequila","Stirred"],ingredients:["50 ml tequila","30 ml cordial clarificado","5 ml solução salina (0,9%)","gelo grande"],steps:["Combine tequila, cordial e sal num copo baixo com gelo grande.","Mexa suavemente.","Sirva sem filtrar."],notes:"Parece água. Engana fácil. A clarificação apaga a cor mas não o sabor.",rating:0,servings:"1",custom:false},
  {name:"Flor de Pressa",categories:["Vodka","Espumante","Spritz","Built"],ingredients:["40 ml vodka","25 ml cordial floral (sabugueiro ou base floral)","espumante para completar"],steps:["Coloque gelo numa taça de vinho.","Adicione vodka e cordial.","Complete com espumante gelado e sirva."],notes:"Perigoso de descer rápido. Floral + bolhas = bebível demais.",rating:0,servings:"1",custom:false},
  {name:"Dourado Frio",categories:["Whisky","Stirred"],ingredients:["50 ml bourbon","25 ml cordial de mel e limão","gelo grande"],steps:["Coloque o gelo num copo baixo.","Adicione bourbon e cordial.","Mexa suavemente e sirva."],notes:"Conforto líquido sem pesar. O cordial integra mel e ácido de forma que o bourbon absorve melhor.",rating:0,servings:"1",custom:false},
  {name:"Névoa Verde",categories:["Gin","Sour","Shaken"],ingredients:["45 ml gin","30 ml Cordial de Pêra Assada","10 ml suco de limão"],steps:["Combine tudo na coqueteleira com gelo.","Bata bem.","Coe em coupe.","Receita de Cordial de Pêra Assada disponível em Preparos Caseiros."],notes:"Aquele drink que você não entende, mas quer outro. Pera assada + ervas do gin + limão = sutileza em camadas.",rating:0,servings:"1",custom:false},

  // ── PREPAROS CASEIROS — XAROPES BASE ──
  {name:"Xarope Simples",categories:["Preparos Caseiros"],ingredients:["200g açúcar refinado","200 ml água filtrada"],steps:["Leve água e açúcar ao fogo médio.","Mexa até dissolver — não deixe ferver.","Retire, deixe esfriar e transfira para frasco."],notes:"Proporção 1:1. A base de quase todo drink. Dura 2 semanas na geladeira. Adicione 1 colher de vodka para conservar por mais tempo.",rating:0,servings:"400 ml",custom:false},
  {name:"Xarope Rico",categories:["Preparos Caseiros"],ingredients:["400g açúcar refinado","200 ml água filtrada"],steps:["Aqueça a água em fogo baixo.","Adicione o açúcar aos poucos, mexendo até dissolver completamente.","Não deixe ferver — retire do fogo assim que homogeneizar.","Deixe esfriar e armazene."],notes:"Proporção 2:1. Mais viscoso e encorpado — dilui menos o drink. Preferido em stirred cocktails (Old Fashioned, Manhattan). Dura até 1 mês na geladeira.",rating:0,servings:"500 ml",custom:false},
  {name:"Xarope Demerara",categories:["Preparos Caseiros"],ingredients:["200g açúcar demerara","200 ml água"],steps:["Leve ao fogo médio e mexa até dissolver.","Não ferva — retire assim que homogeneizar.","Deixe esfriar e armazene."],notes:"Notas de melaço e caramelo que o açúcar refinado não tem. Casa especialmente bem com rum, cachaça envelhecida e bourbon.",rating:0,servings:"400 ml",custom:false},
  {name:"Xarope de Agave",categories:["Preparos Caseiros"],ingredients:["150 ml néctar de agave","75 ml água morna"],steps:["Misture o néctar de agave com a água morna.","Agite bem até homogeneizar.","Armazene em frasco."],notes:"Proporção 2:1 (agave:água). O agave puro é muito viscoso para dosar com precisão — diluído funciona melhor. Base da Tommy's Margarita.",rating:0,servings:"225 ml",custom:false},

  // ── PREPAROS CASEIROS — XAROPES AROMATIZADOS ──
  {name:"Xarope de Mel",categories:["Preparos Caseiros"],ingredients:["150g mel de boa qualidade","100 ml água quente"],steps:["Misture mel e água quente diretamente no frasco.","Agite bem até homogeneizar.","Deixe esfriar antes de usar."],notes:"Não precisa de fogo. Proporção 3:2 (mel:água). Base do Bee's Knees, Gold Rush e Penicillin. Dura 3 semanas na geladeira.",rating:0,servings:"250 ml",custom:false},
  {name:"Xarope de Gengibre",categories:["Preparos Caseiros"],ingredients:["150g gengibre fresco","200g açúcar","200 ml água"],steps:["Rale ou fatie o gengibre sem descascar.","Leve ao fogo com água e açúcar — mexa até dissolver.","Infuse por 30 min fora do fogo.","Coe e transfira para frasco."],notes:"Quanto mais tempo em infusão, mais picante. Para o xarope de mel e gengibre do Penicillin: misture partes iguais deste xarope com xarope de mel.",rating:0,servings:"350 ml",custom:false},
  {name:"Xarope de Canela",categories:["Preparos Caseiros"],ingredients:["3 paus de canela","200g açúcar","200 ml água"],steps:["Leve tudo ao fogo médio até dissolver.","Ferva por 5 minutos para intensificar.","Retire do fogo, tampe e infuse por 1 hora.","Coe e armazene."],notes:"Base do Donn's Mix do Zombie. Ótimo também em drinks de inverno com bourbon e rum envelhecido.",rating:0,servings:"350 ml",custom:false},
  {name:"Xarope de Cardamomo",categories:["Preparos Caseiros"],ingredients:["10 vagens de cardamomo verde","200g açúcar","200 ml água"],steps:["Abra as vagens pressionando com a faca — não precisa triturar.","Leve ao fogo com água e açúcar até dissolver.","Retire do fogo, tampe e infuse por 30 minutos.","Coe e armazene."],notes:"Aromático e levemente picante. Muito usado em gin sours e drinks nórdicos. Casa bem com vodka e aquavit.",rating:0,servings:"350 ml",custom:false},
  {name:"Xarope de Lavanda",categories:["Preparos Caseiros"],ingredients:["2 col. sopa flores de lavanda secas (culinárias)","200g açúcar","200 ml água"],steps:["Ferva água com açúcar até dissolver.","Retire do fogo, adicione a lavanda.","Tampe e infuse por 20 minutos.","Coe bem e armazene."],notes:"Não infuse demais — fica medicinal. 15–20 min é o ponto certo. Base do Lavender Gin Sour.",rating:0,servings:"350 ml",custom:false},
  {name:"Xarope de Hibisco",categories:["Preparos Caseiros"],ingredients:["15g flores de hibisco secas","200g açúcar","400 ml água"],steps:["Ferva a água e adicione o hibisco.","Infuse por 10 minutos — ficará vermelho intenso.","Coe, leve ao fogo com o açúcar e dissolva sem ferver.","Armazene em frasco."],notes:"Cor vibrante, acidez natural e levemente tanânico. Alternativa ao cranberry em sours. Ótimo com gin, vodka e tequila.",rating:0,servings:"500 ml",custom:false},
  {name:"Xarope de Hortelã",categories:["Preparos Caseiros"],ingredients:["1 maço grande de hortelã fresca","200g açúcar","200 ml água"],steps:["Ferva água e açúcar até dissolver.","Retire do fogo e mergulhe a hortelã.","Infuse por 30 minutos tampado.","Coe sem espremer e armazene."],notes:"Não esprema a hortelã na coagem — amarga. Eleva qualquer Mojito e serve de base para coquetéis gelados de verão.",rating:0,servings:"350 ml",custom:false},

  // ── PREPAROS CASEIROS — CORDIAIS ──
  {name:"Cordial de Limão",categories:["Preparos Caseiros"],ingredients:["Casca de 4 limões sicilianos (só a parte amarela)","200g açúcar","200 ml água","60 ml suco de limão siciliano fresco"],steps:["Faça xarope simples com água e açúcar.","Retire do fogo e adicione as cascas de limão.","Infuse por 2 horas tampado.","Coe e misture com o suco de limão fresco."],notes:"Mais rico que o Rose's industrializado. Essencial para o Gimlet clássico. Dura 2 semanas na geladeira.",rating:0,servings:"350 ml",custom:false},
  {name:"Cordial de Toranja",categories:["Preparos Caseiros"],ingredients:["Zest de 2 grapefruits (aprox 20g)","Suco de 2 grapefruits (aprox 180 ml)","200g açúcar"],steps:["Coloque o zest, o suco e o açúcar no liquidificador.","Bata por 1 minuto até o açúcar dissolver e a casca liberar os óleos.","Coe bem em peneira fina ou pano.","Armazene em frasco na geladeira."],notes:"O zest processado junto libera óleos essenciais que o suco sozinho não tem — é o que diferencia este cordial. Cítrico, amargo e profundo. Casa com gin, tequila e mezcal.",rating:0,servings:"300 ml",custom:false},
  {name:"Cordial de Sabugueiro",categories:["Preparos Caseiros"],ingredients:["10g flores de sabugueiro secas (ou 20 cachos frescos)","400g açúcar","400 ml água","Casca e suco de 2 limões sicilianos","2g ácido cítrico"],steps:["Prepare xarope simples com água e açúcar.","Retire do fogo e adicione as flores e a casca de limão.","Infuse por 24 horas em temperatura ambiente.","Coe, adicione o suco de limão e o ácido cítrico.","Armazene em frasco escuro."],notes:"Alternativa caseira ao St-Germain — mais fresco e menos adocicado. Flores frescas dão resultado superior. Dura 2 semanas na geladeira.",rating:0,servings:"600 ml",custom:false},
  {name:"Cordial de Framboesa",categories:["Preparos Caseiros"],ingredients:["250g framboesas frescas ou congeladas","200g açúcar","150 ml água","15 ml suco de limão"],steps:["Leve framboesas, açúcar e água ao fogo médio.","Amasse levemente com colher enquanto aquece.","Assim que ferver, retire do fogo e coe sem espremer.","Adicione o suco de limão e armazene."],notes:"Mais intenso que grenadine, com acidez real de fruta. Base do Kir, Russian Spring Punch e Mule de Framboesa.",rating:0,servings:"350 ml",custom:false},

  {name:"Cordial de Cítricos Clarificado",categories:["Preparos Caseiros"],ingredients:["200 ml suco de limão (tahiti ou siciliano)","150 g açúcar","2 g ácido cítrico","1 g ácido málico","100 ml água","50 ml leite integral"],steps:["Misture tudo menos o leite.","Aqueça levemente (sem ferver).","Adicione o leite frio — vai talhar (é o plano).","Aguarde 10 min e coe lentamente por filtro de café ou pano.","Armazene na geladeira."],notes:"Clarificação com leite: o ácido coagula as proteínas do leite que arrastam os taninos e partículas. Resultado: líquido cristalino com acidez polida. Parece suco, mas se comporta como um drink inteiro.",rating:0,servings:"400 ml",custom:false},
  {name:"Cordial de Frutas Vermelhas com Chá",categories:["Preparos Caseiros"],ingredients:["200 g frutas vermelhas (mistas ou só framboesa)","150 g açúcar","150 ml chá de hibisco (ou chá preto forte)","1 colher suco de limão"],steps:["Amasse as frutas com o açúcar até dissolver.","Adicione o chá (frio ou morno).","Deixe descansar por 12h na geladeira.","Coe sem apertar muito.","Adicione o limão e armazene."],notes:"O chá dá estrutura tânica tipo vinho leve. Fica mais complexo que um cordial de fruta simples.",rating:0,servings:"450 ml",custom:false},
  {name:"Cordial Verde",categories:["Preparos Caseiros"],ingredients:["1 maço hortelã","1 maço manjericão","200 g açúcar","200 ml água","50 ml suco de limão"],steps:["Dissolva o açúcar na água morna até virar xarope simples. Esfrie.","Bata hortelã e manjericão no xarope frio por 20s.","Coe imediatamente por pano fino.","Adicione o limão e armazene na geladeira."],notes:"Para cor vibrante: branqueie as folhas em água quente por 10s antes de bater. Usar frio preserva os óleos essenciais.",rating:0,servings:"400 ml",custom:false},
  {name:"Cordial de Abacaxi com Especiarias",categories:["Preparos Caseiros"],ingredients:["300 g abacaxi picado","200 g açúcar","200 ml água","1 pau de canela","2 cravos","30 ml suco de limão"],steps:["Leve abacaxi, açúcar, água, canela e cravo ao fogo médio.","Cozinhe por 15 min em fogo baixo.","Retire do fogo e deixe esfriar completamente.","Adicione o limão e coe.","Armazene na geladeira."],notes:"Fica quase um tiki shortcut. A canela e o cravo sustentam o doce do abacaxi. Combina com rum, bourbon e gin.",rating:0,servings:"500 ml",custom:false},
  {name:"Cordial de Pêra Assada",categories:["Preparos Caseiros"],ingredients:["4 peras maduras","300 g açúcar","250 ml água quente","80–120 ml suco de limão","pitada de sal","pequeno pedaço de canela","pequena casca de laranja"],steps:["Asse as peras a 200°C até caramelizar levemente.","No liquidificador, bata pera assada, água quente, açúcar, sal, canela e casca de laranja. Bata bastante.","Coe em peneira fina ou voal/filtro de café — deixar um pouco de corpo intensifica o resultado.","Adicione o limão aos poucos (80–120 ml). O ponto certo é quando ainda parece pera mas ganha brilho e comprimento."],notes:"Opcional: 1 ml de extrato natural de baunilha ou meia fava infusionada rapidamente eleva o resultado com CRF, bourbon ou rum envelhecido — mas não exagere, a baunilha domina a pera com facilidade.",rating:0,servings:"~500 ml",custom:false},

  // ── PREPAROS CASEIROS — MODIFICADORES COMPLEXOS ──
  {name:"Grenadine Caseira",categories:["Preparos Caseiros"],ingredients:["250 ml suco de romã puro (ou 4 romãs espremidas)","250g açúcar","10 ml suco de limão","splash de água de flor de laranjeira (opcional)"],steps:["Misture suco de romã e açúcar em fogo baixo.","Mexa até dissolver — não ferva (perde a cor).","Adicione limão e flor de laranjeira.","Deixe esfriar e armazene."],notes:"A grenadine industrial é corante e xarope de milho. A caseira tem cor e profundidade reais. Dura 3 semanas na geladeira.",rating:0,servings:"400 ml",custom:false},
  {name:"Xarope de amêndoa (Orgeat)",categories:["Preparos Caseiros"],ingredients:["200g amêndoas cruas sem sal","300g açúcar","250 ml água","30 ml água de flor de laranjeira","5 ml extrato de amêndoa (opcional)"],steps:["Cubra as amêndoas com água fervente por 1 min e retire a pele.","Triture as amêndoas com a água no liquidificador por 2 min.","Coe em pano de musselina espremendo bem — este é o leite de amêndoa.","Leve ao fogo com açúcar até dissolver.","Retire, adicione flor de laranjeira e extrato. Deixe esfriar."],notes:"Indispensável no Mai Tai e no Trinidad Sour. Espremer bem o bagaço é onde está o sabor.",rating:0,servings:"500 ml",custom:false},
  {name:"Falernum Caseiro",categories:["Preparos Caseiros"],ingredients:["500 ml cachaça ou rum branco","60g amêndoas fatiadas","Casca de 5 limas","5 cravos-da-índia","1 col. chá extrato de baunilha","1 col. chá extrato de amêndoa","Suco de 2 limas","300g açúcar","200 ml água"],steps:["Infuse a cachaça com amêndoas, casca de lima e cravos por 24h.","Coe a infusão descartando os sólidos.","Prepare xarope simples com açúcar e água.","Misture a infusão com o xarope, suco de lima e extratos.","Armazene em frasco escuro."],notes:"Licor caribenho de cravo, amêndoa e lima. Essencial no Zombie e no Illegal Sour. Versão sem álcool: substitua a cachaça por água e infuse por 48h.",rating:0,servings:"750 ml",custom:false},

  // ── PREPAROS CASEIROS — COMPOTAS ──
  {name:"Compota de Caju",categories:["Compota","Preparos Caseiros"],ingredients:["500g caju (suco e fruta)","1 xícara açúcar demerara","1 pau de canela","~1 xícara água (adicionada aos poucos)"],steps:["Com um garfo, faça furos em cada caju.","Tire a castanha e aperte para extrair todo o líquido — reserve o suco.","Corte cada caju em 3 pedaços.","Em fogo baixo, combine o suco do caju, o açúcar, um pouco de água, os pedaços de caju e a canela.","Cozinhe por aproximadamente 1 hora, adicionando água aos poucos conforme for secando.","O ponto certo é quando a compota escurece e fica espessa — não deixe secar completamente."],notes:"A calda que sobra é o ingrediente do Caju Amigo. Guarde em frasco de vidro na geladeira por até 2 semanas.",rating:0,servings:"1 pote",custom:false},

  // ── CLÁSSICOS IBA & OUTROS (adicionados dos PDFs) ──
  {name:"Champagne Cocktail",categories:["Conhaque","Espumante","Sparkling","Built"],ingredients:["90 ml champagne ou espumante brut gelado","20 ml conhaque","1 cubo de açúcar","2 dashes Angostura Bitters"],steps:["Embeba o cubo de açúcar com Angostura e coloque no fundo da taça.","Adicione o conhaque.","Complete devagar com o champagne gelado."],notes:"Um dos primeiros coquetéis documentados (1862). O cubo dissolve enquanto você bebe.",rating:0,servings:"1",custom:false},
  {name:"Mint Julep",categories:["Whisky","Smash","Built"],ingredients:["60 ml bourbon","4 ramos de hortelã fresca","10 ml xarope simples","gelo triturado"],steps:["Macere suavemente a hortelã com o xarope no fundo do copo.","Encha com gelo triturado.","Despeje o bourbon por cima.","Mexa suavemente e decore com ramo de hortelã.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Obrigatório no Kentucky Derby. O copo metálico gelado é parte do ritual.",rating:0,servings:"1",custom:false},
  {name:"Rusty Nail",categories:["Whisky","Drambuie","Stirred"],ingredients:["45 ml Scotch whisky","25 ml Drambuie","casca de limão"],steps:["Coloque gelo em rocks.","Adicione o Scotch e o Drambuie.","Mexa suavemente.","Expresse a casca de limão e decore."],notes:"Drambuie é um licor de mel e ervas feito com base em Scotch — complementares por natureza.",rating:0,servings:"1",custom:false},
  {name:"French Martini",categories:["Vodka","Shaken"],ingredients:["45 ml vodka","15 ml Chambord ou licor de framboesa","30 ml suco de abacaxi fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente — o abacaxi cria espuma natural.","Coe em taça coupe gelada."],notes:"IBA official. A espuma de abacaxi é a assinatura visual. Agite com força.",rating:0,servings:"1",custom:false},
  {name:"Gibson",categories:["Gin","Vermute seco","Stirred"],ingredients:["75 ml gin","15 ml vermute seco","cebola pérola em conserva (garnish)"],steps:["Mexa gin e vermute com gelo por 30s.","Coe em taça coupe gelada.","Decore com cebola pérola — nunca azeitona."],notes:"É um Dry Martini, mas a cebola em conserva é o que define o Gibson.",rating:0,servings:"1",custom:false},
  {name:"Angel Face",categories:["Gin","Shaken"],ingredients:["30 ml gin","30 ml apricot brandy (licor de damasco)","30 ml calvados ou brandy de maçã"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"IBA official. Partes iguais — o calvados e o damasco elevam o gin de forma inesperada.",rating:0,servings:"1",custom:false},
  {name:"Monkey Gland",categories:["Gin","Sour","Shaken"],ingredients:["45 ml gin","45 ml suco de laranja fresco","1 col. chá absinto","1 col. chá grenadine"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe.","Receita de Grenadine Caseira disponível em Preparos Caseiros."],notes:"Criado no Harry's New York Bar, Paris, c. 1920. O absinto e a grenadine aparecem como sombras discretas.",rating:0,servings:"1",custom:false},
  {name:"Brandy Crusta",categories:["Conhaque","Luxardo Maraschino","Sour","Stirred"],ingredients:["52 ml conhaque","7 ml Luxardo Maraschino","7 ml Curaçao de laranja","15 ml suco de limão","5 ml xarope simples","2 dashes Angostura","açúcar na borda"],steps:["Prepare a borda da taça com açúcar.","Mexa todos os ingredientes com gelo.","Coe na taça preparada.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"De Nova Orleans, c. 1850 — ancestral direto do Sidecar e do Cosmopolitan.",rating:0,servings:"1",custom:false},
  {name:"Casino",categories:["Gin","Luxardo Maraschino","Sour","Shaken"],ingredients:["40 ml gin (Old Tom ou London Dry)","10 ml Luxardo Maraschino","10 ml suco de limão","2 dashes Orange Bitters"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em taça coupe."],notes:"IBA classic. Com Old Tom Gin (levemente adocicado) fica mais equilibrado.",rating:0,servings:"1",custom:false},
  {name:"Paradise",categories:["Gin","Sour","Shaken"],ingredients:["30 ml gin","20 ml apricot brandy (licor de damasco)","15 ml suco de laranja fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"IBA classic. Proporção 3:2:1,5. Floral, frutado e direto.",rating:0,servings:"1",custom:false},
  {name:"Old Cuban",categories:["Rum Envelhecido","Espumante","Fizz","Shaken"],ingredients:["45 ml rum envelhecido","22 ml suco de lima","22 ml xarope simples","6 folhas de hortelã","2 dashes Angostura Bitters","60 ml champagne ou prosecco brut"],steps:["Macere levemente a hortelã na coqueteleira.","Agite rum, lima, xarope, hortelã e Angostura com gelo.","Coe em taça. Complete com espumante gelado.","Decore com folha de hortelã.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Criado por Audrey Saunders, c. 2001. Um Mojito elevado ao território do champagne.",rating:0,servings:"1",custom:false},
  {name:"Yellow Bird",categories:["Rum Branco","Triple Sec","Tiki","Licor","Sour","Shaken"],ingredients:["30 ml rum branco","15 ml Galliano","15 ml Cointreau","15 ml suco de lima"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"Drink caribenho dos anos 1950. O Galliano herbal é o segredo da personalidade.",rating:0,servings:"1",custom:false},
  {name:"Trinidad Sour",categories:["Whisky","Sour","Shaken"],ingredients:["45 ml Angostura Bitters","30 ml Xarope de amêndoa (Orgeat)","22 ml suco de limão","15 ml whisky de centeio"],steps:["Mexa tudo com gelo no copo misturador.","Coe em coupe.","Receita de Xarope de amêndoa (Orgeat) disponível em Preparos Caseiros."],notes:"O Angostura como espírito base — não como acento. O orgeat doma o amargor. Surpreende a todos.",rating:0,servings:"1",custom:false},
  {name:"Barracuda",categories:["Rum Envelhecido","Espumante","Licor","Highball","Shaken"],ingredients:["45 ml rum dourado","15 ml Galliano","60 ml suco de abacaxi fresco","10 ml suco de lima","prosecco para completar"],steps:["Agite rum, Galliano, abacaxi e lima com gelo.","Coe em copo alto.","Complete com prosecco gelado."],notes:"IBA official. Galliano + abacaxi + prosecco: tropical e elegante ao mesmo tempo.",rating:0,servings:"1",custom:false},
  {name:"Tipperary",categories:["Whisky","Vermute Rosso","Licor","Stirred"],ingredients:["50 ml Irish whiskey","25 ml vermute tinto doce","15 ml Green Chartreuse","2 dashes Angostura"],steps:["Mexa tudo com gelo no copo misturador.","Coe em taça coupe."],notes:"Um Manhattan com Green Chartreuse no lugar do Maraschino. A erva transforma tudo.",rating:0,servings:"1",custom:false},
  {name:"Suffering Bastard",categories:["Conhaque","Gin","Ginger Beer","Highball","Shaken"],ingredients:["30 ml conhaque","30 ml gin","15 ml suco de lima","2 dashes Angostura","cerveja de gengibre para completar"],steps:["Agite conhaque, gin, lima e Angostura com gelo.","Coe em copo alto.","Complete com ginger beer."],notes:"Criado no Cairo, 1942, como 'remédio' pós-festa. IBA official.",rating:0,servings:"1",custom:false},
  {name:"Illegal Sour",categories:["Mezcal","Rum Branco","Luxardo Maraschino","Tiki","Sour","Shaken"],ingredients:["30 ml mezcal","15 ml rum branco jamaicano","15 ml falernum","5 ml Luxardo Maraschino","22 ml suco de lima","15 ml xarope simples","30 ml clara de ovo (opcional)"],steps:["Dry shake com clara por 10s.","Adicione gelo e agite mais 15s.","Coe duplo em coupe.","Receitas de Xarope Simples e Falernum Caseiro disponíveis em Preparos Caseiros."],notes:"IBA official. Mezcal defumado + rum + falernum (cravo, amêndoa, gengibre). Complexo e surpreendente.",rating:0,servings:"1",custom:false},
  {name:"Russian Spring Punch",categories:["Vodka","Espumante","Licor","Fizz","Shaken"],ingredients:["25 ml vodka","25 ml suco de limão","15 ml crème de cassis","10 ml xarope simples","espumante brut para completar"],steps:["Agite vodka, limão, cassis e xarope com gelo.","Coe em flute.","Complete com espumante gelado.","Decore com framboesa.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Criado por Dick Bradsell, anos 1980. Leve, fresco e com cor roxa sedutora.",rating:0,servings:"1",custom:false},
  {name:"El Diablo",categories:["Tequila","Ginger Beer","Highball","Built"],ingredients:["45 ml tequila blanco","20 ml crème de cassis","15 ml suco de lima","cerveja de gengibre para completar"],steps:["Adicione gelo em copo alto.","Coloque tequila, cassis e lima.","Complete com ginger beer. Mexa uma vez.","Decore com rodela de lima."],notes:"O cassis no fundo cria um degradê vermelho tentador. Refrescante e com profundidade.",rating:0,servings:"1",custom:false},
  {name:"Bloody Maria",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","120 ml suco de tomate","15 ml suco de limão","2 dashes molho inglês","2 dashes Tabasco","sal de aipo","pimenta-do-reino"],steps:["Combine tudo em copo alto com gelo.","Role o copo (não mexa) para misturar.","Decore com aipo e limão."],notes:"A Bloody Mary com tequila. A tequila traz terroir que a vodka não tem.",rating:0,servings:"1",custom:false},
  {name:"Salty Dog",categories:["Vodka","Highball","Built"],ingredients:["60 ml vodka","120 ml suco de grapefruit fresco","sal na borda"],steps:["Prepare a borda com sal grosso.","Encha com gelo.","Adicione vodka e suco de grapefruit. Mexa."],notes:"Sem sal na borda vira Greyhound. Com gin, é a versão clássica britânica.",rating:0,servings:"1",custom:false},
  {name:"Bronx Cocktail",categories:["Gin","Vermute Bianco","Vermute Rosso","Sour","Shaken"],ingredients:["45 ml gin","22 ml vermute tinto doce","22 ml vermute seco","30 ml suco de laranja fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"Clássico nova-iorquino de 1906. O suco de laranja suaviza o duplo vermute.",rating:0,servings:"1",custom:false},
  {name:"Pimm's Cup",categories:["Licor","Collins","Highball","Built"],ingredients:["60 ml Pimm's No. 1","30 ml suco de limão","limonada ou ginger ale para completar","rodelas de pepino","morangos fatiados","hortelã fresca"],steps:["Encha copo alto com gelo.","Adicione Pimm's e suco de limão.","Complete com limonada.","Decore generosamente com pepino, morango e hortelã."],notes:"O drink do verão inglês. Obrigatório em Wimbledon.",rating:0,servings:"1",custom:false},
  {name:"Zombie",categories:["Rum Envelhecido","Rum Branco","Tiki","Blended","Shaken"],ingredients:["45 ml rum jamaicano","30 ml rum Demerara","30 ml rum branco envelhecido ou gold rum","22 ml suco de lima","22 ml suco de grapefruit","15 ml falernum","15 ml xarope de canela","5 ml grenadine","1 dash Angostura"],steps:["Combine tudo com 170g de gelo triturado no liquidificador.","Bata rapidamente (pulse, não contínuo).","Despeje em copo alto e decore com hortelã e frutas.","Receitas de Xarope de Canela, Grenadine Caseira e Falernum Caseiro disponíveis em Preparos Caseiros."],notes:"Criado por Donn Beach, c. 1934. Limite de 2 por pessoa — não é brincadeira.",rating:0,servings:"1",custom:false},
  {name:"Grasshopper",categories:["Licor","Shaken"],ingredients:["20 ml crème de menthe verde","20 ml crème de cacao branco","20 ml creme de leite fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em taça coupe."],notes:"Clássico americano pós-Proibição. Verde, cremoso e mentolado — sobremesa líquida.",rating:0,servings:"1",custom:false},
  {name:"Golden Dream",categories:["Triple Sec","Licor","Shaken"],ingredients:["20 ml Galliano","20 ml Cointreau","20 ml suco de laranja fresco","20 ml creme de leite fresco"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem e coe em taça coupe."],notes:"IBA official after-dinner. Partes iguais — Galliano herbal + creme + laranja + Cointreau.",rating:0,servings:"1",custom:false},
  {name:"Cachanchara",categories:["Rum Branco","Built"],ingredients:["60 ml aguardente de cana cubana ou cachaça","15 ml mel cru","15 ml suco de lima","50 ml água"],steps:["Misture mel e água no copo para diluir.","Adicione o suco de lima.","Coloque gelo e o destilado.","Mexa com energia."],notes:"Drink tradicional cubano — considerado precursor do Mojito. Simples e honesto.",rating:0,servings:"1",custom:false},
  {name:"Collins de Toranja com Ervas",categories:["Gin","Collins","Built"],ingredients:["50 ml gin","25 ml Cordial de Toranja","água com gás para completar","ramo de alecrim ou manjericão"],steps:["Encha copo alto com gelo.","Adicione o gin e o cordial de toranja.","Complete com água com gás e mexa suavemente.","Adicione alecrim ou manjericão para perfumar.","Receita de Cordial de Toranja disponível em Preparos Caseiros."],notes:"O cordial entra como camada aromática extra. A erva fresca amplifica as notas florais do gin.",rating:0,servings:"1",custom:false},
  {name:"Grapefruit Gimlet",categories:["Gin","Sour","Shaken"],ingredients:["50 ml gin","25 ml Cordial de Toranja"],steps:["Combine gin e cordial na coqueteleira com gelo.","Mexa bem por 20s.","Coe em taça de coquetel gelada.","Receita de Cordial de Toranja disponível em Preparos Caseiros."],notes:"Releitura elegante do Gimlet com cordial caseiro. Minimalista e afiado — os óleos da casca dão profundidade que o suco sozinho não tem.",rating:0,servings:"1",custom:false},
  {name:"Spritz de Toranja",categories:["Espumante","Spritz","Built"],ingredients:["40 ml Cordial de Toranja","60 ml espumante brut","40 ml água com gás"],steps:["Encha taça de vinho com gelo.","Adicione o cordial de toranja.","Complete com espumante e água com gás. Mexa suavemente.","Receita de Cordial de Toranja disponível em Preparos Caseiros."],notes:"Aperitivo leve com amargor natural da toranja. Bitter sem precisar de bitter.",rating:0,servings:"1",custom:false},
  {name:"Highball de Toranja e Bourbon",categories:["Whisky","Highball","Built"],ingredients:["50 ml bourbon","20 ml Cordial de Toranja","água com gás para completar"],steps:["Encha copo alto com gelo.","Adicione o bourbon e o cordial de toranja.","Complete com água com gás e mexa suavemente.","Receita de Cordial de Toranja disponível em Preparos Caseiros."],notes:"Refrescante, levemente amargo e equilibrado. Funciona muito bem com bourbon mais doce, como Buffalo Trace.",rating:0,servings:"1",custom:false},
  {name:"Margarita Laranja Sanguínea e Aperol",categories:["Tequila","Sour","Shaken"],ingredients:["60 ml tequila","15 ml Aperol","30 ml suco de laranja sanguínea","30 ml suco de limão taiti","30 ml xarope simples"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"O Aperol substitui o licor de laranja — traz amargor e cor sem doçura extra. A laranja sanguínea aprofunda o perfil cítrico.",rating:0,servings:"1",custom:false},
  {name:"Key Lime Pie Margarita",categories:["Tequila","Triple Sec","Sour","Shaken"],ingredients:["60 ml tequila","15 ml licor de laranja","30 ml suco de limão taiti","15 ml xarope de baunilha","2 barspoons iogurte de limão","biscoito graham cracker triturado para a borda"],steps:["Prepare a borda com biscoito triturado.","Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Releitura da torta em drinque. O iogurte traz cremosidade e acidez láctica — a baunilha amarra o conjunto.",rating:0,servings:"1",custom:false},
  {name:"Margarita Ancho Chili e Toranja",categories:["Tequila","Triple Sec","Sour","Shaken"],ingredients:["45 ml tequila","15 ml licor de laranja","30 ml suco de limão taiti","30 ml suco de grapefruit","15 ml xarope de pimenta ancho","borda de ancho chili, sal e raspas de limão"],steps:["Prepare a borda com ancho chili, sal e raspas de limão.","Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo."],notes:"Xarope de ancho chili: ferva 1 xícara de água + 1 xícara de açúcar + 2 col. sopa de pimenta ancho moída. Coe e esfrie. Defumado, cítrico e com calor progressivo.",rating:0,servings:"1",custom:false},
  {name:"Margarita Picante de Pepino",categories:["Tequila","Sour","Shaken"],ingredients:["45 ml tequila","15 ml Licor de pimenta (Ancho Reyes)","15 ml xarope de agave","30 ml suco de limão taiti","22 ml suco de pepino","borda de tajin"],steps:["Prepare a borda com tajin.","Combine tudo na coqueteleira com gelo.","Agite por 15s.","Coe em rocks com gelo.","Receita de Xarope de Agave disponível em Preparos Caseiros."],notes:"Licor de pimenta (Ancho Reyes) no lugar do licor de laranja — pimenta e notas defumadas. O pepino refresca e equilibra o calor.",rating:0,servings:"1",custom:false},
  {name:"Alaska",categories:["Gin","Licor","Stirred"],ingredients:["45 ml gin","15 ml Chartreuse amarela","1 dash bitters"],steps:["Mexa gin e Chartreuse com gelo em copo misturador por 30s.","Coe em taça de coquetel gelada.","Decore com casca de limão."],notes:"Minimalista, herbal e muito elegante. O Chartreuse amplifica o gin sem dominar.",rating:0,servings:"1",custom:false},
  {name:"Bijou",categories:["Gin","Vermute Rosso","Licor","Stirred"],ingredients:["30 ml gin","30 ml vermute tinto","30 ml Chartreuse verde"],steps:["Mexa tudo com gelo em copo misturador por 30s.","Coe em taça de coquetel.","Decore com cereja marrasquino."],notes:"Herbal intenso, quase um jardim engarrafado. Proporções iguais — sem dominante, todos brigam lindamente.",rating:0,servings:"1",custom:false},
  {name:"Brown Derby",categories:["Whisky","Sour","Shaken"],ingredients:["50 ml bourbon","25 ml suco de toranja","10-15 ml mel (ou xarope de mel 1:1)"],steps:["Combine bourbon, suco de toranja e mel na coqueteleira com gelo.","Agite bem por 12s.","Coe em coupe.","Decore com casca de toranja.","Receita de Xarope de Mel disponível em Preparos Caseiros."],notes:"Bourbon + toranja + mel: simples no papel, elegante no copo. Clássico Hollywood dos anos 1930. Se usar mel puro, dissolva com um pouco de suco antes de bater.",rating:0,servings:"1",custom:false},
  {name:"Champs-Élysées",categories:["Conhaque","Licor","Sour","Shaken"],ingredients:["45 ml conhaque","15 ml Chartreuse amarela","15 ml suco de limão siciliano","10 ml xarope simples (ou mel)","1 dash Angostura"],steps:["Combine tudo na coqueteleira com gelo.","Agite bem.","Coe em taça coupe.","Decore com casca de limão.","Receita de Xarope Simples disponível em Preparos Caseiros."],notes:"Ácido + doce + herbal em equilíbrio preciso. Um Sour vestido de alfaiataria francesa. Mel no lugar do xarope traz mais complexidade.",rating:0,servings:"1",custom:false},
  {name:"Cynar Spritz",categories:["Cynar","Spritz","Built"],ingredients:["60 ml Cynar","90 ml espumante brut (ou prosecco)","água com gás a gosto","gelo","1 rodela de laranja"],steps:["Encha um copo largo com gelo.","Adicione o Cynar, depois o espumante.","Complete com água com gás.","Mexa suavemente e decore com rodela de laranja."],notes:"Aperol Spritz com mais personalidade e amargura herbal. Vai embora mais rápido do que deveria.",rating:0,servings:"1",custom:false},
  {name:"Pegu Club",categories:["Gin","Triple Sec","Sour","Shaken"],ingredients:["50 ml gin","20 ml curaçao de laranja","15 ml suco de limão","1 dash Angostura","1 dash orange bitters"],steps:["Combine tudo na coqueteleira com gelo.","Agite e coe em coupe.","Decore com casca de limão."],notes:"Criado no Pegu Club de Rangoon (atual Yangon), c. 1920. Um Sour mais sofisticado e seco.",rating:0,servings:"1",custom:false},
  {name:"Remember the Maine",categories:["Whisky","Luxardo Maraschino","Vermute Rosso","Stirred"],ingredients:["50 ml whisky de centeio ou bourbon","20 ml vermute tinto","1 bar spoon Luxardo Maraschino","rinse de absinto"],steps:["Enxague a taça de coquetel com absinto e descarte o excesso.","Mexa o whisky, vermute e Maraschino com gelo em copo misturador por 30s.","Coe na taça preparada.","Decore com cereja."],notes:"Um Manhattan mais profundo e levemente misterioso. O absinto é sutil mas transforma o drink.",rating:0,servings:"1",custom:false},

  // ── NOVAS RECEITAS ──
  {name:"Jungle Bird Maraschino",categories:["Rum Envelhecido","Campari","Luxardo Maraschino","Tiki","Sour","Shaken"],ingredients:["45 ml rum jamaicano escuro","20 ml Campari","10 ml Luxardo Maraschino","45 ml suco de abacaxi","15 ml suco de limão Tahiti","10 ml xarope demerara 2:1"],steps:["Combine tudo na coqueteleira com bastante gelo.","Agite vigorosamente por 12–15 segundos.","Coe para rocks com gelo fresco ou gelo triturado parcial.","Decore com folha de abacaxi, cereja Luxardo e casca de laranja.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"O Luxardo aprofunda o Campari sem apagar o rum. Mais elegante que o clássico.",rating:0,servings:"1",custom:false},
  {name:"Highball de Amburana & Sal",categories:["Cachaça Envelhecida","Highball","Built"],ingredients:["50 ml cachaça envelhecida em amburana","5 ml solução salina","100 ml soda ultra gelada","twist de laranja"],steps:["Coloque gelo alto num copo highball.","Adicione a cachaça e a solução salina.","Complete com soda ultra gelada.","Expresse o twist de laranja e sirva."],notes:"Seco. Adulto. Estranho no bom sentido.",rating:0,servings:"1",custom:false},
  {name:"Cachaça & Jerez",categories:["Cachaça Envelhecida","Jerez","Stirred"],ingredients:["45 ml cachaça envelhecida","25 ml fino sherry","1 dash bitter de laranja"],steps:["Mexa tudo com gelo em copo misturador por 30s.","Coe em coupe gelada.","Decore com casca de laranja."],notes:"",rating:0,servings:"1",custom:false},
  {name:"Mezcal & Cenoura Queimada",categories:["Mezcal","Sour","Shaken"],ingredients:["45 ml mezcal","20 ml suco de cenoura assada","10 ml mel queimado","10 ml suco de limão","pitada de sal"],steps:["Combine tudo na coqueteleira com gelo.","Agite por 12s.","Coe em coupe."],notes:"Vegetal, defumado e surpreendente. O mel queimado ancora o mezcal.",rating:0,servings:"1",custom:false},
  {name:"Cynar & Soda Salina",categories:["Cynar","Highball","Built"],ingredients:["45 ml Cynar","10 ml vinho branco seco","2 gotas solução salina","soda para completar"],steps:["Coloque gelo num copo alto.","Adicione Cynar, vinho e solução salina.","Complete com soda e mexa suavemente."],notes:"Minimalista. Italiano. Moderno.",rating:0,servings:"1",custom:false},
  {name:"Kingston Mineral",categories:["Rum Envelhecido","Stirred"],ingredients:["45 ml rum jamaicano","15 ml chá preto frio","5 ml xarope demerara","2 gotas solução salina"],steps:["Combine tudo no copo misturador com gelo.","Mexa por 25s.","Coe em rocks com gelo grande.","Receita de Xarope Demerara disponível em Preparos Caseiros."],notes:"",rating:0,servings:"1",custom:false},
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// ─── SISTEMA DE BACKGROUND DE CARD (DESCOBRIR) ────────────────────────────────
const CARD_BG_FILES = {
  velvet_aperitivo: "/bg/velvet-aperitivo-v2.webp",
  midnight_citrus:  "/bg/midnight-citrus-v2.webp",
  tropical_static:  "/bg/tropical-static-v2.webp",
  smoked_amber:     "/bg/smoked-amber-v2.webp",
  frost_tide:       "/bg/frost-tide-v2.webp",
  silk_cream:       "/bg/silk-cream-v2.webp",
  herbal_noir:      "/bg/herbal-noir-v2.webp",
  electric_tiki:    "/bg/electric-tiki-v2.webp",
  vintage_soda:     "/bg/vintage-soda-v2.webp",
  espresso_void:    "/bg/espresso-void-v2.webp",
  rose_static:      "/bg/rose-static-v2.webp",
  polar_minimal:    "/bg/polar-minimal-v2.webp",
};
const CARD_SPIRIT_TINTS = {
  "Gin":                 "rgba(70,130,90,0.22)",
  "Rum Branco":          "rgba(210,190,110,0.18)",
  "Rum Envelhecido":     "rgba(155,75,15,0.24)",
  "Bourbon":             "rgba(170,95,20,0.22)",
  "Vodka":               "rgba(170,205,235,0.14)",
  "Whisky":              "rgba(175,95,15,0.26)",
  "Tequila":             "rgba(195,175,45,0.18)",
  "Mezcal":              "rgba(110,85,45,0.24)",
  "Pisco":               "rgba(195,175,135,0.16)",
  "Conhaque":            "rgba(155,85,15,0.24)",
  "Campari":             "rgba(195,25,15,0.24)",
  "Aperol":              "rgba(215,105,15,0.22)",
  "Cynar":               "rgba(45,75,25,0.24)",
  "Averna":              "rgba(35,25,15,0.26)",
  "Fernet":              "rgba(25,45,25,0.26)",
  "Licor Strega":        "rgba(195,175,35,0.22)",
  "St‑Germain":          "rgba(175,205,75,0.18)",
  "Absinto":             "rgba(35,155,55,0.22)",
  "Cachaça":             "rgba(95,145,45,0.18)",
  "Cachaça Envelhecida": "rgba(135,75,25,0.22)",
  "Lillet":              "rgba(215,195,95,0.18)",
  "Porto":               "rgba(95,25,55,0.24)",
  "Jerez":               "rgba(175,135,55,0.20)",
  "Vinho":               "rgba(115,35,55,0.22)",
  "Espumante":           "rgba(235,215,135,0.16)",
};
const CARD_FAMILY_OVERLAYS = {
  "Sour":      "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(0,0,0,0.18) 100%)",
  "Highball":  "linear-gradient(180deg, transparent 25%, rgba(0,0,0,0.28) 100%)",
  "Collins":   "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.25) 100%)",
  "Stirred":   "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 35%, rgba(0,0,0,0.32) 100%)",
  "Built":     "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.22) 100%)",
  "Shaken":    "linear-gradient(125deg, rgba(255,255,255,0.05) 0%, transparent 45%, rgba(0,0,0,0.12) 100%)",
  "Tiki":      "linear-gradient(135deg, rgba(255,140,0,0.10) 0%, transparent 55%)",
  "Frozen":    "linear-gradient(180deg, rgba(185,235,255,0.10) 0%, transparent 65%)",
  "Blended":   "linear-gradient(180deg, rgba(185,235,255,0.08) 0%, transparent 65%)",
  "Spritz":    "linear-gradient(180deg, rgba(255,215,170,0.08) 0%, transparent 55%)",
  "Sparkling": "linear-gradient(180deg, rgba(255,215,170,0.07) 0%, transparent 55%)",
  "Buck":      "linear-gradient(135deg, rgba(255,200,80,0.06) 0%, transparent 50%)",
  "Hot":       "linear-gradient(180deg, rgba(255,90,0,0.10) 0%, transparent 65%)",
  "Smash":     "linear-gradient(135deg, rgba(80,180,80,0.08) 0%, transparent 55%)",
};
const RECIPE_MOODS = {
  "Aperol Spritz": "frost_tide",
  "Aviation": "midnight_citrus",
  "Beirão & Maracujá": "tropical_static",
  "Beirão + Campari": "velvet_aperitivo",
  "Beirão Lemon": "frost_tide",
  "Beirão Spritz": "frost_tide",
  "Beirão, Mel & Alecrim": "frost_tide",
  "Bourbon, laranja e gengibre": "smoked_amber",
  "Bramble": "midnight_citrus",
  "Cantaloupe Martini sem álcool": "frost_tide",
  "Citrus Martini": "velvet_aperitivo",
  "Coco e tônica": "frost_tide",
  "Cynar Ginger Spritz": "frost_tide",
  "Daiquiri Parisiense": "rose_static",
  "Dark 'n' Stormy": "frost_tide",
  "Garden Gin": "midnight_citrus",
  "Dry Martini": "polar_minimal",
  "Elderflower Aviation": "rose_static",
  "Elderflower Daiquiri": "rose_static",
  "Fermentação selvagem (Ginger Bug)": "frost_tide",
  "Flor de Cerejeira Fizz": "rose_static",
  "Flor de Cerejeira Spritz": "rose_static",
  "French 75": "midnight_citrus",
  "Garden Spritz": "rose_static",
  "Gin Fizz": "midnight_citrus",
  "Gin Tônica": "frost_tide",
  "Gin Tônica de Bergamota": "frost_tide",
  "Ginger beer (caseira)": "frost_tide",
  "Grenadine Ginger Margarita": "midnight_citrus",
  "Hemingway Daiquiri Cordial": "tropical_static",
  "Hemingway Daiquiri": "tropical_static",
  "Highball de Luxardo": "frost_tide",
  "Hurricane": "tropical_static",
  "Jamaica Rouge": "tropical_static",
  "Jasmine (Casa do Porco)": "velvet_aperitivo",
  "Jus dinger": "tropical_static",
  "Lavender Gin Sour": "midnight_citrus",
  "Licor Beirão Sour": "frost_tide",
  "Manhattan": "smoked_amber",
  "Manhattan (Perfect)": "smoked_amber",
  "Highball de Luxardo com Whisky": "frost_tide",
  "Improved Whiskey Cocktail": "smoked_amber",
  "Maraschino Spritz": "frost_tide",
  "Margarita": "midnight_citrus",
  "Martinez": "polar_minimal",
  "Mojito": "vintage_soda",
  "Mojito Amendoado": "vintage_soda",
  "Mojito de framboesa": "vintage_soda",
  "Moscow Mule": "frost_tide",
  "Mr. Grinch": "midnight_citrus",
  "Negroni": "velvet_aperitivo",
  "Negroni Sbagliato": "frost_tide",
  "Old Fashioned": "smoked_amber",
  "Pisco Elderflower Sour": "rose_static",
  "Pisco Sour": "frost_tide",
  "Andes Highball": "frost_tide",
  "Uva & Sal": "frost_tide",
  "Flor de Pedra": "rose_static",
  "Campo Seco": "velvet_aperitivo",
  "Pisco & Coco Tostado": "frost_tide",
  "Verde Urbano": "frost_tide",
  "Noite em Lima": "espresso_void",
  "Pisco com Cerveja Branca": "frost_tide",
  "Seco de Maçã": "frost_tide",
  "Pisco Terroso": "frost_tide",
  "Sazerac": "smoked_amber",
  "SAZERAC por Kennedy Nascimento": "smoked_amber",
  "Sevilla Sour": "rose_static",
  "Shanksjillo": "espresso_void",
  "Smoked Apple Whiskey Tonic": "frost_tide",
  "Smokey Martini": "polar_minimal",
  "Spring Martini": "rose_static",
  "St‑Germain Hugo Spritz": "rose_static",
  "St‑Germain Spritz": "rose_static",
  "The Clover Club": "midnight_citrus",
  "Tom Gatsby": "midnight_citrus",
  "Whiskey Mule de Romã": "frost_tide",
  "Whiskey Sour": "smoked_amber",
  "White Russian de abóbora": "frost_tide",
  "Daiquiri": "tropical_static",
  "Cosmopolitan": "frost_tide",
  "Gimlet": "midnight_citrus",
  "Americano": "frost_tide",
  "Boulevardier": "velvet_aperitivo",
  "Rob Roy": "smoked_amber",
  "Vieux Carré": "smoked_amber",
  "Amaretto Sour": "frost_tide",
  "New York Sour": "smoked_amber",
  "Espresso Martini": "espresso_void",
  "Sidecar": "smoked_amber",
  "Bee's Knees": "midnight_citrus",
  "Last Word": "midnight_citrus",
  "Penicillin": "smoked_amber",
  "Gold Rush": "smoked_amber",
  "Cuba Libre": "frost_tide",
  "Paper Plane": "velvet_aperitivo",
  "Singapore Sling": "tropical_static",
  "Mimosa": "frost_tide",
  "Bellini": "frost_tide",
  "Rossini": "frost_tide",
  "Tintoretto": "frost_tide",
  "Puccini": "frost_tide",
  "Kir Royale": "frost_tide",
  "Tommy's Margarita": "midnight_citrus",
  "Caipiroska": "frost_tide",
  "White Russian": "frost_tide",
  "Frozen Daiquiri": "silk_cream",
  "Frozen Margarita": "silk_cream",
  "Mezcal Negroni": "velvet_aperitivo",
  "Oaxacan Old Fashioned": "smoked_amber",
  "Paloma Cordial": "frost_tide",
  "Paloma": "frost_tide",
  "Tequila Sunrise": "frost_tide",
  "Piña Colada": "tropical_static",
  "Mai Tai": "electric_tiki",
  "Jungle Bird": "tropical_static",
  "Irish Coffee": "espresso_void",
  "Hot Toddy": "smoked_amber",
  "Black Russian": "polar_minimal",
  "Godfather": "smoked_amber",
  "Ramos Gin Fizz": "midnight_citrus",
  "Vodka Tônica": "frost_tide",
  "Caipirinha Clássica": "vintage_soda",
  "Caipirinha com Rapadura": "vintage_soda",
  "Caipirinha de Limão-Cravo": "vintage_soda",
  "Caipirinha de Três Limões": "vintage_soda",
  "Caipirinha de Maracujá e Limão": "tropical_static",
  "Caipirinha de Abacaxi Tostado": "tropical_static",
  "Caipirinha de Cambuci": "vintage_soda",
  "Caipirinha de Limão-Siciliano e Capim-Santo": "vintage_soda",
  "Caipirinha de Tangerina Verde e Salina": "vintage_soda",
  "Caipirinha de Caju e Mel": "tropical_static",
  "Caipirinha de Maracujá e Kaffir": "tropical_static",
  "Caipirinha de Uva Verde": "vintage_soda",
  "Caipirinha de Caju Clássica": "tropical_static",
  "Caju com Limão-Cravo": "tropical_static",
  "Caju, Salina e Pimenta-Rosa": "tropical_static",
  "Caju Tostado": "tropical_static",
  "Caju e Louro": "tropical_static",
  "Caju e Coco Seco": "tropical_static",
  "Caju Vínico": "tropical_static",
  "Caipirinha de Caju com Rum de Coco": "tropical_static",
  "Caju & Oak": "smoked_amber",
  "Jardim de Caju": "tropical_static",
  "Caju Escuro": "tropical_static",
  "Caju Bianco": "tropical_static",
  "Fumaça Tropical": "tropical_static",
  "Caju Spritz": "frost_tide",
  "Caju Noturno": "espresso_void",
  "Caju Verde": "tropical_static",
  "Maracujá Tônico": "tropical_static",
  "Gold Passion": "tropical_static",
  "Passo Solar": "tropical_static",
  "Maracujá Amargo": "frost_tide",
  "Linha do Equador": "tropical_static",
  "Pornstar Martini": "tropical_static",
  "Saturn": "electric_tiki",
  "Cobra's Fang": "electric_tiki",
  "Passion Fruit Margarita": "tropical_static",
  "Whiskey Sour de Maracujá": "tropical_static",
  "Highball de Cajuína": "frost_tide",
  "Gin & Cajuína": "tropical_static",
  "Rabo de Galo com Cajuína": "tropical_static",
  "Cajuína & Mezcal": "tropical_static",
  "Cajuína Old Fashioned": "smoked_amber",
  "Tequila & Cajuína": "tropical_static",
  "Batida de Coco": "silk_cream",
  "Batida de Maracujá": "tropical_static",
  "Cachaça Sour": "vintage_soda",
  "Quentão": "vintage_soda",
  "Rabo de Galo": "vintage_soda",
  "Leite de Onça": "vintage_soda",
  "Caju Amigo": "tropical_static",
  "Macunaíma": "velvet_aperitivo",
  "Gabriela": "vintage_soda",
  "Cachaça Collins": "frost_tide",
  "Old Fashioned de Cachaça": "vintage_soda",
  "Caipirinha Envelhecida": "vintage_soda",
  "Honey & Wood": "vintage_soda",
  "Julep Brasileiro": "vintage_soda",
  "Amaro Tropical": "vintage_soda",
  "Madeira & Abacaxi": "tropical_static",
  "Café com Cachaça": "espresso_void",
  "Orchard Brasileiro": "vintage_soda",
  "Cachaça Manhattan": "vintage_soda",
  "Spiced Cane": "vintage_soda",
  "Rabo de Galo Envelhecido": "velvet_aperitivo",
  "Sazerac Brasileiro": "herbal_noir",
  "Tropical Old Fashioned": "tropical_static",
  "Brandy Alexander": "smoked_amber",
  "Between the Sheets": "tropical_static",
  "Stinger": "smoked_amber",
  "French Connection": "smoked_amber",
  "Spicy Margarita": "midnight_citrus",
  "Ranch Water": "frost_tide",
  "Batanga": "frost_tide",
  "Naked and Famous": "smoked_amber",
  "Mezcal Sour": "smoked_amber",
  "Matador": "tropical_static",
  "Agave Spritz": "frost_tide",
  "Verde Brisa": "frost_tide",
  "Sol e Sal": "frost_tide",
  "Sombra na Areia": "tropical_static",
  "Cacto Poético": "midnight_citrus",
  "Bruma de Agave": "smoked_amber",
  "Fumaça de Frutas": "tropical_static",
  "Vesper": "rose_static",
  "Bloody Mary": "frost_tide",
  "Harvey Wallbanger": "frost_tide",
  "Sex on the Beach": "frost_tide",
  "Lemon Drop": "frost_tide",
  "Mule de Framboesa": "frost_tide",
  "El Presidente": "vintage_soda",
  "Planter's Punch": "frost_tide",
  "Rum Old Fashioned": "vintage_soda",
  "Painkiller": "tropical_static",
  "Mary Pickford": "tropical_static",
  "Tom Collins": "midnight_citrus",
  "Corpse Reviver #2": "rose_static",
  "White Lady": "midnight_citrus",
  "Hanky Panky": "velvet_aperitivo",
  "Southside": "midnight_citrus",
  "20th Century": "rose_static",
  "Black Manhattan": "smoked_amber",
  "Toronto": "velvet_aperitivo",
  "Blood and Sand": "smoked_amber",
  "Horse's Neck": "frost_tide",
  "Highland Orchard": "frost_tide",
  "Honey & Heather": "frost_tide",
  "Golden Citrus Fizz": "frost_tide",
  "Autumn Smoke": "smoked_amber",
  "Bitter Hive": "velvet_aperitivo",
  "Spiced Nightcap": "smoked_amber",
  "Barley Highball": "frost_tide",
  "Tropical Heather": "tropical_static",
  "Elder Fashion": "rose_static",
  "French Gimlet": "rose_static",
  "St-Germain Sour": "rose_static",
  "The Harvest": "rose_static",
  "Jardim Elétrico": "rose_static",
  "Pera & Fumaça": "rose_static",
  "Citrus Cloud": "rose_static",
  "Vinho de Jardim": "rose_static",
  "Chá da Tarde": "rose_static",
  "Dourado Amargo": "rose_static",
  "Estufa": "rose_static",
  "Flor Rubra": "rose_static",
  "Floral Mule Leve": "rose_static",
  "Tuxedo": "herbal_noir",
  "Rose": "rose_static",
  "Strega Sour": "herbal_noir",
  "Strega Spritz": "frost_tide",
  "Italian Buck": "frost_tide",
  "Witch's Kiss": "herbal_noir",
  "Benevento Old Fashioned": "herbal_noir",
  "Golden Bee": "herbal_noir",
  "Strega Martini": "herbal_noir",
  "Strega Coffee Flip": "espresso_void",
  "Strega Highball": "frost_tide",
  "Giardino Giallo": "herbal_noir",
  "Zafferano Tonic": "frost_tide",
  "Ervas & Casca": "herbal_noir",
  "Campo Noturno": "herbal_noir",
  "Ouro & Fumaça": "herbal_noir",
  "Freddo di Benevento": "herbal_noir",
  "Fruto Secreto": "herbal_noir",
  "Golden Orchard": "herbal_noir",
  "Noite em Benevento": "espresso_void",
  "Citrus Incantation": "herbal_noir",
  "Campo Alto": "herbal_noir",
  "Tropical Esotérico": "herbal_noir",
  "Strega & Tonic Verde": "frost_tide",
  "Golden Orange Fizz": "frost_tide",
  "Alpine Highball": "frost_tide",
  "Floral Witch": "rose_static",
  "Bitter Sunshine": "frost_tide",
  "Bamboo": "velvet_aperitivo",
  "Adonis": "velvet_aperitivo",
  "Sherry Cobbler": "velvet_aperitivo",
  "Rebujito": "frost_tide",
  "Tío Pepe & Tônica": "frost_tide",
  "Sherry Highball": "frost_tide",
  "Sherry Sour": "velvet_aperitivo",
  "East India Sour": "velvet_aperitivo",
  "Sherry Old Fashioned": "velvet_aperitivo",
  "Coronation Cocktail": "velvet_aperitivo",
  "Bosco Notturno": "frost_tide",
  "Caramello Spritz": "frost_tide",
  "Nero Fizz": "velvet_aperitivo",
  "Sicilian Orchard": "velvet_aperitivo",
  "Amaro Tonic Café": "espresso_void",
  "Dark Tropic": "velvet_aperitivo",
  "Jardim Noturno": "rose_static",
  "Maçã Verde Elétrica": "frost_tide",
  "Fennel Tonic": "frost_tide",
  "Solar Verde": "frost_tide",
  "Vinha Fantasma": "frost_tide",
  "Mate Verde": "frost_tide",
  "Abacaxi Anisado": "frost_tide",
  "Green Shandy": "herbal_noir",
  "Fernet & Coke": "frost_tide",
  "Industry Sour": "velvet_aperitivo",
  "Porto Tônico Tinto": "frost_tide",
  "Porto Flip": "velvet_aperitivo",
  "Porto Negroni": "velvet_aperitivo",
  "Porto Branco & Tônica": "frost_tide",
  "Porto Branco Sour": "velvet_aperitivo",
  "Porto Branco Spritz": "frost_tide",
  "Lillet Vive": "rose_static",
  "Lillet Berry": "rose_static",
  "Lillet & Gin Highball": "rose_static",
  "Lillet Honey Lemon": "rose_static",
  "White Negroni Tropical": "rose_static",
  "Lillet Garden Spritz": "rose_static",
  "Cynar Sunset Highball": "rose_static",
  "French Aviation (hack)": "rose_static",
  "Lillet Orchard": "rose_static",
  "Almost Martini": "rose_static",
  "Horta & Laranja Queimada": "rose_static",
  "Lillet Gold Rush": "rose_static",
  "White Orchard Martini": "rose_static",
  "Solar Highball": "rose_static",
  "Lillet Spritz": "rose_static",
  "French Pearl": "rose_static",
  "Lillet & Tônica": "rose_static",
  "Jasmine": "rose_static",
  "Lillet Rosé Spritz": "rose_static",
  "Cynar Tônica": "frost_tide",
  "Black Negroni": "velvet_aperitivo",
  "Fernet Sour": "velvet_aperitivo",
  "Fernet Ginger Highball": "frost_tide",
  "Fernet Spritz": "frost_tide",
  "Jardim Suspenso": "velvet_aperitivo",
  "Bitter Milk Punch": "velvet_aperitivo",
  "Vinho Fantasma": "velvet_aperitivo",
  "Rubor Picante": "velvet_aperitivo",
  "Espresso Amaro Highball": "espresso_void",
  "Casca & Fumaça": "velvet_aperitivo",
  "Bitter & Melão": "velvet_aperitivo",
  "Campari Lemon Tonic": "frost_tide",
  "Laranja & Sal": "frost_tide",
  "Highball Picante": "frost_tide",
  "Uva Amarga": "frost_tide",
  "Bitter Ginger Highball": "velvet_aperitivo",
  "Verde & Amargo": "frost_tide",
  "Tomate Highball": "frost_tide",
  "Sangria": "velvet_aperitivo",
  "Virgin Mojito": "frost_tide",
  "Shirley Temple": "frost_tide",
  "Arnold Palmer": "frost_tide",
  "Hibiscus Fizz": "frost_tide",
  "Cucumber Cooler": "frost_tide",
  "Água de Coco Spritz": "frost_tide",
  "Virgin Margarita": "frost_tide",
  "Ginger Lemonade": "frost_tide",
  "Shrub de Frutas Vermelhas": "frost_tide",
  "Solar Fizz": "frost_tide",
  "Jardim Alto": "midnight_citrus",
  "Trópico Seco": "tropical_static",
  "Rubi Tônico": "frost_tide",
  "Linha Clara": "frost_tide",
  "Flor de Pressa": "frost_tide",
  "Dourado Frio": "smoked_amber",
  "Névoa Verde": "midnight_citrus",
  "Xarope Simples": "frost_tide",
  "Xarope Rico": "frost_tide",
  "Xarope Demerara": "frost_tide",
  "Xarope de Agave": "frost_tide",
  "Xarope de Mel": "frost_tide",
  "Xarope de Gengibre": "frost_tide",
  "Xarope de Canela": "frost_tide",
  "Xarope de Cardamomo": "frost_tide",
  "Xarope de Lavanda": "frost_tide",
  "Xarope de Hibisco": "frost_tide",
  "Xarope de Hortelã": "frost_tide",
  "Cordial de Limão": "frost_tide",
  "Cordial de Toranja": "frost_tide",
  "Cordial de Sabugueiro": "frost_tide",
  "Cordial de Framboesa": "frost_tide",
  "Cordial de Cítricos Clarificado": "frost_tide",
  "Cordial de Frutas Vermelhas com Chá": "frost_tide",
  "Cordial Verde": "frost_tide",
  "Cordial de Abacaxi com Especiarias": "tropical_static",
  "Cordial de Pêra Assada": "frost_tide",
  "Grenadine Caseira": "frost_tide",
  "Xarope de amêndoa (Orgeat)": "frost_tide",
  "Falernum Caseiro": "frost_tide",
  "Champagne Cocktail": "smoked_amber",
  "Mint Julep": "smoked_amber",
  "Rusty Nail": "smoked_amber",
  "French Martini": "tropical_static",
  "Gibson": "polar_minimal",
  "Angel Face": "midnight_citrus",
  "Monkey Gland": "midnight_citrus",
  "Brandy Crusta": "smoked_amber",
  "Casino": "midnight_citrus",
  "Paradise": "midnight_citrus",
  "Old Cuban": "frost_tide",
  "Yellow Bird": "tropical_static",
  "Trinidad Sour": "smoked_amber",
  "Barracuda": "frost_tide",
  "Tipperary": "smoked_amber",
  "Suffering Bastard": "frost_tide",
  "Illegal Sour": "electric_tiki",
  "Russian Spring Punch": "frost_tide",
  "El Diablo": "frost_tide",
  "Bloody Maria": "frost_tide",
  "Salty Dog": "frost_tide",
  "Bronx Cocktail": "midnight_citrus",
  "Pimm's Cup": "frost_tide",
  "Zombie": "electric_tiki",
  "Grasshopper": "frost_tide",
  "Golden Dream": "frost_tide",
  "Cachanchara": "vintage_soda",
  "Collins de Toranja com Ervas": "midnight_citrus",
  "Grapefruit Gimlet": "midnight_citrus",
  "Spritz de Toranja": "frost_tide",
  "Highball de Toranja e Bourbon": "frost_tide",
  "Margarita Laranja Sanguínea e Aperol": "midnight_citrus",
  "Key Lime Pie Margarita": "midnight_citrus",
  "Margarita Ancho Chili e Toranja": "midnight_citrus",
  "Margarita Picante de Pepino": "midnight_citrus",
  "Alaska": "polar_minimal",
  "Bijou": "polar_minimal",
  "Brown Derby": "smoked_amber",
  "Champs-Élysées": "smoked_amber",
  "Cynar Spritz": "frost_tide",
  "Pegu Club": "midnight_citrus",
  "Remember the Maine": "smoked_amber",
  "Jungle Bird Maraschino": "tropical_static",
  "Highball de Amburana & Sal": "frost_tide",
  "Cachaça & Jerez": "velvet_aperitivo",
  "Mezcal & Cenoura Queimada": "smoked_amber",
  "Cynar & Soda Salina": "frost_tide",
  "Kingston Mineral": "vintage_soda",
};
function getMood(recipe) {
  const cats = recipe.categories || [];
  const ings = (recipe.ingredients || []).join(" ").toLowerCase();
  const has  = (...ss) => ss.some(s => cats.includes(s));
  const ing  = (...ws) => ws.some(w => ings.includes(w));
  if (ing("café","espresso","coffee","cold brew"))                                    return "espresso_void";
  if (has("St‑Germain","Lillet"))                                                     return "rose_static";
  if (has("Tiki") && ing("falernum","orgeat","fassionola"))                           return "electric_tiki";
  if (has("Tiki"))                                                                    return "tropical_static";
  if (ing("maracujá","passion fruit") && !has("Campari","Aperol"))                   return "tropical_static";
  if (ing("caju","cajuína") && !has("Campari","Aperol","Whisky"))                   return "tropical_static";
  if (has("Campari","Aperol","Cynar","Averna","Porto","Jerez","Vinho","Fernet") && !has("Highball","Spritz","Tiki")) return "velvet_aperitivo";
  if (has("Absinto","Licor Strega") && !has("Highball","Spritz"))                    return "herbal_noir";
  if (has("Whisky","Conhaque") && has("Stirred","Built") && !has("Highball"))       return "smoked_amber";
  if (has("Mezcal") && !has("Highball","Sour","Collins"))                            return "smoked_amber";
  if (has("Frozen","Blended"))                                                        return "silk_cream";
  if (has("Gin") && has("Stirred") && !has("Sour","Collins","Fizz","Highball"))     return "polar_minimal";
  if (has("Vodka") && has("Stirred") && !has("Sour","Highball"))                    return "polar_minimal";
  if (has("Gin") && has("Sour","Collins","Fizz","Smash"))                           return "midnight_citrus";
  if (has("Highball","Spritz","Sparkling","Collins","Fizz","Buck","Não alcóolicos")) return "frost_tide";
  if (ing("abacaxi","coco tropical","lichia","manga"))                               return "tropical_static";
  if (has("Rum Branco","Rum Envelhecido","Cachaça","Cachaça Envelhecida") && has("Built","Stirred")) return "vintage_soda";
  if (has("Rum Branco","Rum Envelhecido"))                                           return "tropical_static";
  if (has("Cachaça","Cachaça Envelhecida"))                                          return "vintage_soda";
  if (has("Whisky","Conhaque","Mezcal"))                                            return "smoked_amber";
  if (has("Tequila") && has("Sour","Smash"))                                        return "midnight_citrus";
  if (has("Tequila"))                                                                return "frost_tide";
  if (has("Gin"))                                                                    return "midnight_citrus";
  if (has("Vodka"))                                                                  return "frost_tide";
  return "frost_tide";
}

function getCardVisual(recipe, spiritCats=SPIRIT_CATS) {
  const mood         = recipe.moodOverride || recipe.mood || RECIPE_MOODS[recipe.name] || getMood(recipe);
  const cats         = recipe.categories || [];
  const ings         = (recipe.ingredients || []).join(" ").toLowerCase();
  const spiritCat    = cats.find(c => CARD_SPIRIT_TINTS[c]);
  const spiritTint   = spiritCat
    ? CARD_SPIRIT_TINTS[spiritCat]
    : cats.find(c => spiritCats.has(c) && !CARD_SPIRIT_TINTS[c])
      ? "rgba(180,160,130,0.18)"
      : null;
  const TECH         = ["Stirred","Built","Shaken"];
  const familyCat    = STYLE_PRIORITY.find(s => cats.includes(s))
                    || TECH.find(t => cats.includes(t))
                    || null;
  const familyGrad   = familyCat ? CARD_FAMILY_OVERLAYS[familyCat] : null;
  const particleClass =
    (cats.includes("Sparkling")||cats.includes("Spritz")||ings.includes("espumante")||ings.includes("prosecco")||ings.includes("champagne"))
      ? "otr-particles-bubbles"
      : (ings.includes("café")||ings.includes("espresso"))
      ? "otr-particles-grain"
      : null;
  return { bgImage: CARD_BG_FILES[mood] || CARD_BG_FILES.frost_tide, spiritTint, familyGrad, particleClass };
}
function buildCardBg(visual) {
  const layers = [
    "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.30) 44%, transparent 68%)",
    visual.familyGrad,
    visual.spiritTint ? `linear-gradient(${visual.spiritTint}, ${visual.spiritTint})` : null,
    "linear-gradient(rgba(6,4,2,0.46), rgba(6,4,2,0.46))",
    `url('${visual.bgImage}')`,
  ].filter(Boolean);
  const sizes = layers.slice(0,-1).map(()=>"100% 100%").concat("cover").join(", ");
  return {
    backgroundImage: layers.join(", "),
    backgroundSize:  sizes,
    backgroundPosition: layers.map(()=>"center").join(", "),
    backgroundRepeat: "no-repeat",
  };
}

function buildCardBgEditorial(visual, photoPos="center") {
  const dimTint = t => t ? t.replace(/([\d.]+)\)$/, (_, a) => `${(+a * 0.6).toFixed(3)})`) : null;
  const tint = dimTint(visual.spiritTint);
  const layers = [
    visual.familyGrad,
    tint ? `linear-gradient(${tint}, ${tint})` : null,
    // "linear-gradient(rgba(6,4,2,0.32), rgba(6,4,2,0.32))",
    `url('${visual.bgImage}')`,
  ].filter(Boolean);
  const sizes = layers.slice(0,-1).map(()=>"100% 100%").concat("cover").join(", ");
  return {
    backgroundImage: layers.join(", "),
    backgroundSize:  sizes,
    backgroundPosition: [...layers.slice(0,-1).map(()=>"center"), photoPos].join(", "),
    backgroundRepeat: "no-repeat",
  };
}

function getTheme(cats=[]) {
  for (const s of STYLE_PRIORITY) if (cats.includes(s)) return TYPE_THEME[s];
  return TYPE_THEME["_default"];
}
function Stars({n,color}){
  if(!n)return null;
  return <span style={{fontSize:11,color:color||"#C8A96E",letterSpacing:1}}>{"★".repeat(n)}<span style={{opacity:.15}}>{"★".repeat(5-n)}</span></span>;
}

// ─── FORM ─────────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name:"", ingredients:[""], steps:[""], notes:"", rating:0, servings:"", categories:[], perfil:"", sensacao:"", ocasiao:"", flavors:"" };
const labelSt = { display:"block", fontSize:9, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(240,235,225,0.52)", fontWeight:700, marginBottom:7 };
const addBtnSt = { marginTop:4, padding:"5px 12px", borderRadius:3, background:"none", border:"1px solid rgba(240,235,225,0.1)", color:"rgba(240,235,225,0.58)", cursor:"pointer", fontSize:11, letterSpacing:.5, fontFamily:"Archivo,sans-serif" };

function RecipeForm({ initial, initialProfile=null, onSave, onClose, customSpirits=[], sharedFiles=null }) {
  const [form, setForm] = useState(()=>{
    const base = initial || EMPTY_FORM;
    if (!base.perfil && initialProfile?.perfil) {
      return {...base, perfil:initialProfile.perfil, sensacao:initialProfile.sensacao||"", ocasiao:initialProfile.ocasiao||"", flavors:initialProfile.flavors||""};
    }
    return base;
  });
  const [suggesting, setSuggesting] = useState(false);
  const [suggErr, setSuggErr] = useState(null);
  const [suggestingSig, setSuggestingSig] = useState(false);
  const [suggSigErr, setSuggSigErr] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState(null);
  const [previewImgs, setPreviewImgs] = useState([]);
  const photoRef = useRef();

  useEffect(() => { return () => { previewImgs.forEach(u=>URL.revokeObjectURL(u)); }; }, [previewImgs]);

  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const setListItem = (k,i,v) => setForm(f=>({...f,[k]:f[k].map((x,j)=>j===i?v:x)}));
  const addListItem = k => setForm(f=>({...f,[k]:[...f[k],""]}));
  const removeListItem = (k,i) => setForm(f=>({...f,[k]:f[k].filter((_,j)=>j!==i)}));
  const toggleCat = c => setField("categories", form.categories.includes(c) ? form.categories.filter(x=>x!==c) : [...form.categories, c]);

  const scanPhoto = useCallback(async (files) => {
    const fileArr = Array.from(files||[]).filter(Boolean);
    if (!fileArr.length) return;
    const uid = auth.currentUser?.uid || "anon";
    const today = new Date().toISOString().slice(0, 10);
    const rlKey = `otr_scan_${uid}_${today}`;
    const used = parseInt(localStorage.getItem(rlKey) || "0", 10);
    if (used >= 10) {
      setScanErr("Você já usou as 10 leituras de imagem disponíveis por hoje. Volte amanhã — sua barra vai continuar aqui! 🍹");
      return;
    }
    setScanning(true); setScanErr(null);
    setPreviewImgs(fileArr.map(f=>URL.createObjectURL(f)));
    try {
      const imageContents = await Promise.all(fileArr.map(async file=>{
        const base64 = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
        return {type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data:base64}};
      }));
      const response = await fetch("/api/anthropic", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1200, system:`Você é um bartender expert. Extraia a receita de drink ${fileArr.length>1?"das imagens (podem ser partes diferentes de uma mesma receita longa)":"da imagem"} e retorne APENAS um JSON com:\n- "name": nome em português\n- "ingredients": array de strings em português, com medidas em ml (1 fl oz = 30 ml, 1/2 oz = 15 ml, 3/4 oz = 22 ml, 1/4 oz = 7 ml, 2 oz = 60 ml). IMPORTANTE: preserve nomes de marcas, siglas e destilados EXATAMENTE como aparecem na imagem — não substitua, não adicione alternativas entre parênteses, não tente explicar o ingrediente.\n- "steps": array de strings em português, descrevendo o preparo\n- "notes": string em português com observações relevantes\n- "servings": string (ex: "1", "2 pessoas")\n- "styles": array com estilos do drink entre: ${STYLE_PRIORITY.filter(s=>s!=="Preparos Caseiros").join(", ")}\n- "spirits": array com spirits principais entre: ${[...SPIRIT_CATS].join(", ")}\nSem texto fora do JSON.`, messages:[{role:"user",content:[...imageContents,{type:"text",text:`Extraia a receita ${fileArr.length>1?"destas imagens":"desta imagem"} e retorne o JSON.`}]}] }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) throw new Error("Limite de uso atingido. Tente novamente mais tarde.");
        throw new Error("Serviço indisponível no momento. Tente novamente em breve.");
      }
      // só consome a cota diária quando a leitura de fato aconteceu
      localStorage.setItem(rlKey, String(used + 1));
      const parsed = JSON.parse((data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
      const newCats=[...new Set([...(parsed.styles||[]),...(parsed.spirits||[])])];
      setForm(f => ({ ...f, name:parsed.name||f.name, ingredients:parsed.ingredients?.length?parsed.ingredients:f.ingredients, steps:parsed.steps?.length?parsed.steps:f.steps, notes:parsed.notes||f.notes, servings:parsed.servings||f.servings, categories:newCats.length?newCats:f.categories }));
    } catch (e) { setScanErr(e?.message || "Não foi possível ler a receita. Tente novamente."); }
    setScanning(false);
  }, []);

  // imagens vindas do Web Share Target (compartilhadas de outro app) já chegam prontas
  useEffect(()=>{ if(sharedFiles?.length>0) scanPhoto(sharedFiles); },[]);// eslint-disable-line

  const suggestCategories = useCallback(async () => {
    if (!form.ingredients.filter(Boolean).length && !form.name) return;
    setSuggesting(true); setSuggErr(null);
    try {
      const res = await fetch("/api/anthropic", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:600, system:`Você é um bartender especialista. Retorne APENAS um JSON com:\n- "styles": array de estilos entre [${STYLE_PRIORITY.join(", ")}]\n- "spirits": array de spirits entre [${[...new Set([...SPIRIT_CATS,...customSpirits])].sort().join(", ")}]\n- "signature": {"flavors":"ADJ • ADJ • ADJ","perfil":"UmaPalavra","sensacao":"UmaPalavra","ocasiao":"UmaPalavraCurta"}`, messages:[{role:"user",content:`Nome: ${form.name}\nIngredientes:\n${form.ingredients.filter(Boolean).join("\n")}`}] }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error("Limite de uso atingido.");
        throw new Error("Serviço indisponível.");
      }
      const parsed = JSON.parse((data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
      setForm(f=>({...f,categories:[...new Set([...f.categories,...(parsed.styles||[]),...(parsed.spirits||[])])]}));
      if (parsed.signature) {
        setForm(f=>({...f,
          ...(!f.flavors && parsed.signature.flavors ? {flavors:parsed.signature.flavors} : {}),
          ...(!f.perfil  && parsed.signature.perfil  ? {perfil:parsed.signature.perfil}   : {}),
          ...(!f.sensacao&& parsed.signature.sensacao? {sensacao:parsed.signature.sensacao}: {}),
          ...(!f.ocasiao && parsed.signature.ocasiao ? {ocasiao:parsed.signature.ocasiao}  : {}),
        }));
      }
    } catch (e) { setSuggErr(e?.message || "Erro ao sugerir."); }
    setSuggesting(false);
  }, [form.name, form.ingredients]);

  const suggestSignature = useCallback(async () => {
    if (!form.name) return;
    setSuggestingSig(true); setSuggSigErr(null);
    try {
      const res = await fetch("/api/anthropic", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:280, system:"Sommelier de coquetéis. Responda APENAS com JSON válido, sem texto adicional.", messages:[{role:"user",content:`Drink: "${form.name}"\nIngredientes: ${form.ingredients.filter(Boolean).join(", ")}\n\nGere perfil em português:\n{"flavors":"ADJ • ADJ • ADJ","perfil":"UmaPalavra","sensacao":"UmaPalavra","ocasiao":"UmaPalavraCurta"}`}] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Serviço indisponível.");
      const parsed = JSON.parse((data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
      setForm(f=>({...f,
        ...(parsed.flavors  ? {flavors:parsed.flavors}   : {}),
        ...(parsed.perfil   ? {perfil:parsed.perfil}     : {}),
        ...(parsed.sensacao ? {sensacao:parsed.sensacao} : {}),
        ...(parsed.ocasiao  ? {ocasiao:parsed.ocasiao}   : {}),
      }));
    } catch (e) { setSuggSigErr(e?.message || "Erro ao sugerir."); }
    setSuggestingSig(false);
  }, [form.name, form.ingredients]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, originalName:initial?.name, ingredients:form.ingredients.filter(Boolean), steps:form.steps.filter(Boolean), custom:initial?.custom??true, id:initial?.id||Date.now() });
  };

  const inp = (extra={}) => ({ style:{ width:"100%", background:"rgba(240,235,225,0.04)", border:"1px solid rgba(240,235,225,0.16)", borderRadius:3, padding:"8px 11px", color:"#F0EBE1", fontSize:13, outline:"none", fontFamily:"Archivo,sans-serif", ...extra.style }, ...extra });
  const theme = getTheme(form.categories);

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20,backdropFilter:"blur(12px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0A0A0A",border:"1px solid rgba(240,235,225,0.15)",borderRadius:6,width:"100%",maxWidth:620,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{padding:"24px 28px 30px"}}>
          <input ref={photoRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{if(e.target.files?.length)scanPhoto(e.target.files);e.target.value="";}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:initial?22:16}}>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:"#F0EBE1"}}>{initial?"Editar receita":"Nova receita"}</h2>
            <button onClick={onClose} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:"50%",width:30,height:30,color:"rgba(240,235,225,0.4)",fontSize:16,cursor:"pointer"}}>×</button>
          </div>
          {!initial&&!previewImgs.length&&!scanning&&(
            <button onClick={()=>photoRef.current?.click()} style={{display:"flex",alignItems:"center",gap:13,width:"100%",marginBottom:20,padding:"13px 16px",borderRadius:4,background:"rgba(200,169,110,0.05)",border:"1px dashed rgba(200,169,110,0.22)",cursor:"pointer",textAlign:"left",transition:"border-color .15s",boxSizing:"border-box"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(200,169,110,0.48)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(200,169,110,0.22)"}>
              <span style={{fontSize:22,flexShrink:0,lineHeight:1}}>📷</span>
              <div>
                <div style={{fontSize:12,color:"#C8A96E",fontFamily:"Archivo,sans-serif",fontWeight:600,letterSpacing:.3,marginBottom:3}}>Importar da foto</div>
                <div style={{fontSize:11,color:"rgba(240,235,225,0.38)",fontFamily:"Archivo,sans-serif",lineHeight:1.45}}>Selecione um ou mais prints — o app transcreve todos automaticamente</div>
              </div>
            </button>
          )}

          {previewImgs.length>0&&(
            <div style={{marginBottom:16,position:"relative"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {previewImgs.map((url,i)=>(
                  <div key={i} style={{flex:"1 1 calc(50% - 3px)",minWidth:100,borderRadius:5,overflow:"hidden",border:"1px solid rgba(240,235,225,0.13)"}}>
                    <img src={url} alt={`print ${i+1}`} style={{width:"100%",height:110,objectFit:"cover",display:"block",opacity:scanning?.5:1}}/>
                  </div>
                ))}
              </div>
              {scanning&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,borderRadius:5}}><div style={{fontSize:28}}>🔍</div><div style={{fontSize:12,color:"#C8A96E",letterSpacing:1.5,textTransform:"uppercase"}}>Analisando{previewImgs.length>1?` ${previewImgs.length} fotos`:""}…</div></div>}
              {!scanning&&<button onClick={()=>setPreviewImgs([])} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.65)",border:"none",borderRadius:"50%",width:24,height:24,color:"rgba(240,235,225,0.7)",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
            </div>
          )}
          {scanErr&&<div style={{marginBottom:14,padding:"9px 13px",borderRadius:3,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#F87171",fontSize:12}}>{scanErr}</div>}

          <label style={labelSt}>Nome do drink</label>
          <input {...inp()} value={form.name} onChange={e=>setField("name",e.target.value)} placeholder="ex: Gin Sour de Lavanda" style={{...inp().style,marginBottom:18,fontSize:15}}/>

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
              {STYLE_PRIORITY.map(s=>{const th=TYPE_THEME[s]||TYPE_THEME["_default"];const on=form.categories.includes(s);return <button key={s} onClick={()=>toggleCat(s)} style={{padding:"3px 10px",borderRadius:20,fontSize:11,background:on?th.accent+"22":"rgba(240,235,225,0.04)",border:`1px solid ${on?th.accent+"66":"rgba(240,235,225,0.08)"}`,color:on?th.label:"rgba(240,235,225,0.50)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s}</button>;})}
            </div>
            <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.45)",marginBottom:6}}>Spirits / Ingredientes principais</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {[...new Set([...ALL_SPIRIT_OPTIONS,...customSpirits])].sort().map(s=>{const on=form.categories.includes(s);return <button key={s} onClick={()=>toggleCat(s)} style={{padding:"3px 10px",borderRadius:20,fontSize:11,background:on?"rgba(160,120,90,0.15)":"rgba(240,235,225,0.04)",border:`1px solid ${on?"rgba(160,120,90,0.5)":"rgba(240,235,225,0.08)"}`,color:on?"#A0785A":"rgba(240,235,225,0.48)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s}</button>;})}
            </div>
          </div>

          {/* ── Assinatura ── */}
          <div style={{marginTop:18,paddingTop:16,borderTop:"1px solid rgba(240,235,225,0.11)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <label style={{...labelSt,margin:0}}>Assinatura</label>
              <button onClick={suggestSignature} disabled={suggestingSig||!form.name.trim()} style={{padding:"3px 12px",borderRadius:20,fontSize:10,background:"rgba(160,120,90,0.12)",border:"1px solid rgba(160,120,90,0.4)",color:"#A0785A",cursor:"pointer",letterSpacing:.5,fontFamily:"Archivo,sans-serif",opacity:!form.name.trim()?.5:1}}>
                {suggestingSig?"sugerindo…":"✦ sugerir com IA"}
              </button>
              {suggSigErr&&<span style={{fontSize:11,color:"#F87171"}}>{suggSigErr}</span>}
            </div>
            <input {...inp()} value={form.flavors} onChange={e=>setField("flavors",e.target.value)} placeholder="ex: Cítrico • Floral • Amadeirado" style={{...inp().style,marginBottom:10,fontSize:12}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[["perfil","Perfil","ex: Elegante"],["sensacao","Sensação","ex: Aveludado"],["ocasiao","Ocasião","ex: Início de noite"]].map(([key,lbl,ph])=>(
                <div key={key}>
                  <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.38)",marginBottom:5,fontWeight:700}}>{lbl}</div>
                  <input {...inp()} value={form[key]} onChange={e=>setField(key,e.target.value)} placeholder={ph} style={{...inp().style,fontSize:12}}/>
                </div>
              ))}
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

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel, danger=false }) {
  const dismiss = onCancel ?? onConfirm;
  return (
    <div onClick={dismiss} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 32px"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0F0D0A",border:`1px solid ${danger?"rgba(239,68,68,0.14)":"rgba(240,235,225,0.08)"}`,borderRadius:8,padding:"28px 22px 22px",maxWidth:300,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.9)",textAlign:"center"}}>
        <div style={{fontSize:13,color:"rgba(240,235,225,0.68)",fontFamily:"Archivo,sans-serif",lineHeight:1.65,marginBottom:24}}>{message}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {onCancel&&<button onClick={onCancel} style={{padding:"8px 20px",borderRadius:3,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.38)",fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",letterSpacing:.3}}>cancelar</button>}
          <button onClick={onConfirm} style={{padding:"8px 20px",borderRadius:3,background:danger?"rgba(239,68,68,0.12)":"rgba(160,120,90,0.12)",border:`1px solid ${danger?"rgba(239,68,68,0.3)":"rgba(160,120,90,0.3)"}`,color:danger?"#F87171":"#A0785A",fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",fontWeight:600,letterSpacing:.3}}>{onCancel?"confirmar":"ok"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SCROLL REVEAL ────────────────────────────────────────────────────────────
// cada item revela (fade + sobe) quando entra na viewport durante a rolagem;
// os primeiros, já visíveis ao montar, revelam em cascata por delay
function Reveal({children,index=0}){
  const ref=useRef();
  const [shown,setShown]=useState(false);
  useEffect(()=>{
    const el=ref.current;
    if(!el||typeof IntersectionObserver==="undefined"){setShown(true);return;}
    const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setShown(true);io.disconnect();}},{rootMargin:"0px 0px -32px 0px",threshold:0.04});
    io.observe(el);
    return ()=>io.disconnect();
  },[]);
  return <div ref={ref} className={shown?"otr-reveal otr-reveal-in":"otr-reveal"} style={shown&&index<10?{transitionDelay:`${index*55}ms`}:undefined}>{children}</div>;
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
// memo: só re-renderiza quando os dados visíveis mudam — os handlers são
// ignorados de propósito (seu comportamento é coberto pelos props comparados)
const DrinkCard=memo(function DrinkCard({recipe,isFav,onFav,isTried,onTried,isComanda,onComanda,hasAll,onClick,onDelete,spiritCats=SPIRIT_CATS,customBg,packName}){
  const theme=getTheme(recipe.categories);
  const visual=getCardVisual(recipe,spiritCats);
  const displayVisual=customBg?{...visual,bgImage:customBg}:visual;
  const styleTag=recipe.categories.find(c=>STYLE_CATS.has(c));
  const spiritTag=recipe.categories.find(c=>spiritCats.has(c));
  const [quickActions,setQuickActions]=useState(false);
  const longPressTimer=useRef();
  const wasLongPress=useRef(false);
  const startLongPress=()=>{wasLongPress.current=false;longPressTimer.current=setTimeout(()=>{wasLongPress.current=true;setQuickActions(true);},500);};
  const endLongPress=()=>clearTimeout(longPressTimer.current);
  return(
    <div
      onPointerDown={startLongPress} onPointerUp={endLongPress} onPointerLeave={endLongPress} onPointerCancel={endLongPress}
      onClick={()=>{if(wasLongPress.current)return;onClick();}}
      style={{position:"relative",height:136,borderRadius:12,backgroundColor:"#0A0906",...buildCardBgEditorial(displayVisual),
        border:`1.5px solid ${theme.accent}`,overflow:"hidden",cursor:"pointer",
        boxShadow:`0 4px 16px rgba(0,0,0,0.9), 0 0 40px ${theme.accent}10`,
        transition:"transform .2s ease, box-shadow .2s ease"}}>

      {/* overlays atmosféricos */}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(3,1,0,0.22) 0%, rgba(3,1,0,0.0) 18%, rgba(3,1,0,0.55) 58%, rgba(3,1,0,0.96) 100%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 75% at 50% 50%, transparent 28%, rgba(0,0,0,0.82) 100%)",mixBlendMode:"multiply",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,borderRadius:12,pointerEvents:"none",mixBlendMode:"screen",
        background:`radial-gradient(ellipse 80% 45% at -8% 108%, ${theme.accent} 0%, ${theme.accent}aa 5%, ${theme.accent}55 22%, ${theme.accent}18 45%, transparent 68%)`}}/>
      {visual.particleClass&&<div className={visual.particleClass} style={{position:"absolute",inset:0,pointerEvents:"none"}}/>}

      {/* topo: tags (esquerda) + badge pack/autoral (direita) */}
      <div style={{position:"absolute",top:10,left:12,right:10,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          {styleTag&&<span style={{...CARD_TYPO.tag,color:"rgba(231,224,205,0.82)",background:"rgba(0,0,0,0.52)",backdropFilter:"blur(6px)",padding:"3px 7px",borderRadius:3}}>{styleTag}</span>}
          {spiritTag&&<span style={{...CARD_TYPO.tag,color:theme.accent,background:`rgba(0,0,0,0.45)`,backdropFilter:"blur(6px)",padding:"3px 7px",borderRadius:3,opacity:1}}>{spiritTag}</span>}
        </div>
        {(recipe.custom||recipe.adjusted||packName)&&(
          <div style={{display:"inline-flex",alignItems:"center",gap:4,flexShrink:0,padding:"1px 7px 1px 5px",borderRadius:20,background:"rgba(0,0,0,0.52)",border:`1px solid ${theme.accent}44`,backdropFilter:"blur(4px)"}}>
            <span style={{fontSize:7,color:theme.accent,opacity:0.8,lineHeight:1}}>◈</span>
            <span style={{fontSize:7,letterSpacing:1.5,textTransform:"uppercase",color:`${theme.accent}CC`,fontFamily:"Archivo,sans-serif",fontWeight:600}}>
              {recipe.custom?"AUTORAL":recipe.adjusted?"AJUSTADA":packName}
            </span>
          </div>
        )}
      </div>

      {/* fundo: nome + linha (esquerda) · fav + taça + check (direita) */}
      <div style={{position:"absolute",bottom:10,left:12,right:10,display:"flex",alignItems:"flex-end",gap:8}}>
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:5}}>
          <div style={{fontFamily:"'Gloock',serif",
            fontSize:recipe.name.length>22?19:recipe.name.length>18?21:recipe.name.length>14?24:27,
            fontWeight:400,lineHeight:1.15,color:"rgba(231,224,205,0.97)",letterSpacing:"-0.3px",
            overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",paddingBottom:3,
            textShadow:"0 1px 4px rgba(0,0,0,0.9), 0 2px 16px rgba(0,0,0,0.7)"}}>{recipe.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{height:2,width:24,background:theme.accent,borderRadius:2,opacity:0.9}}/>
            <div style={{width:5,height:2,borderRadius:1,background:theme.accent,opacity:0.9}}/>
            {recipe.rating>0&&<Stars n={recipe.rating} color={theme.accent}/>}
            {hasAll&&<span style={{...CARD_TYPO.counter,color:"#4ADE80",opacity:.8}}>tenho tudo</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0,paddingBottom:2}}>
          <button onClick={e=>{e.stopPropagation();onFav();}} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 5px",transition:"all .2s",color:isFav?theme.accent:"rgba(255,255,255,0.22)",filter:isFav?`drop-shadow(0 0 5px ${theme.accent}88)`:"none"}}>
            {isFav?<svg width="14" height="11" viewBox="0 0 20 15" fill={theme.accent}><path d="M10 13.5C10 13.5 1 8 1 4C1 1.8 2.8.5 5.5.5 7.5.5 9 1.8 10 3.5 11 1.8 12.5.5 14.5.5 17.2.5 19 1.8 19 4 19 8 10 13.5 10 13.5z"/></svg>
            :<svg width="14" height="11" viewBox="0 0 20 15" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"><path d="M10 13.5C10 13.5 1 8 1 4C1 1.8 2.8.5 5.5.5 7.5.5 9 1.8 10 3.5 11 1.8 12.5.5 14.5.5 17.2.5 19 1.8 19 4 19 8 10 13.5 10 13.5z"/></svg>}
          </button>
          <button onClick={e=>{e.stopPropagation();onComanda();}} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 5px",transition:"all .2s",color:isComanda?"#C8A96E":"rgba(255,255,255,0.22)",filter:isComanda?"drop-shadow(0 0 5px rgba(200,169,110,0.7))":"none"}}>
            <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4 L19 4 L11 14 Z"/><line x1="11" y1="14" x2="11" y2="19"/><line x1="7" y1="19" x2="15" y2="19"/>
            </svg>
          </button>
          <button onClick={e=>{e.stopPropagation();onTried();}} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 5px",transition:"all .2s",color:isTried?"#4ADE80":"rgba(255,255,255,0.22)",filter:isTried?"drop-shadow(0 0 5px rgba(74,222,128,0.6))":"none"}}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,8 6,12 14,4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ações rápidas (long press) */}
      {quickActions&&(
        <div onClick={e=>{e.stopPropagation();setQuickActions(false);}}
          style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",borderRadius:12,display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",gap:8,padding:"16px",zIndex:10}}>
          <button onClick={e=>{e.stopPropagation();onTried();setQuickActions(false);}} style={{...CARD_TYPO.actionBtn,padding:"8px 14px",borderRadius:20,cursor:"pointer",background:isTried?"rgba(74,222,128,0.12)":"rgba(240,235,225,0.07)",border:`1px solid ${isTried?"rgba(74,222,128,0.4)":"rgba(240,235,225,0.18)"}`,color:isTried?"#4ADE80":"rgba(240,235,225,0.75)"}}>{isTried?"Remover provada":"Já provei"}</button>
          <button onClick={e=>{e.stopPropagation();onComanda();setQuickActions(false);}} style={{...CARD_TYPO.actionBtn,padding:"8px 14px",borderRadius:20,cursor:"pointer",background:isComanda?"rgba(200,169,110,0.12)":"rgba(240,235,225,0.07)",border:`1px solid ${isComanda?"rgba(200,169,110,0.4)":"rgba(240,235,225,0.18)"}`,color:isComanda?"#C8A96E":"rgba(240,235,225,0.75)"}}>{isComanda?"Remover da comanda":"+ Comanda"}</button>
          <button onClick={e=>{e.stopPropagation();onFav();setQuickActions(false);}} style={{...CARD_TYPO.actionBtn,padding:"8px 14px",borderRadius:20,cursor:"pointer",background:isFav?`${theme.accent}18`:"rgba(240,235,225,0.07)",border:`1px solid ${isFav?theme.accent+"44":"rgba(240,235,225,0.18)"}`,color:isFav?theme.accent:"rgba(240,235,225,0.75)"}}>{isFav?"Desfavoritar":"Favoritar"}</button>
          <button onClick={e=>{e.stopPropagation();onDelete?.();setQuickActions(false);}} style={{...CARD_TYPO.actionBtn,padding:"8px 14px",borderRadius:20,cursor:"pointer",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.35)",color:"#F87171"}}>Excluir</button>
        </div>
      )}
    </div>
  );
},(prev,next)=>
  prev.recipe===next.recipe&&
  prev.isFav===next.isFav&&
  prev.isTried===next.isTried&&
  prev.isComanda===next.isComanda&&
  prev.hasAll===next.hasAll&&
  prev.customBg===next.customBg&&
  prev.packName===next.packName&&
  prev.spiritCats===next.spiritCats
);

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({recipe,onClose,isFav,onFav,isTried,onTried,isComanda,onComanda,onRating,onNote,onFilter,onEdit,onDelete,onRepo,profile,spiritCats=SPIRIT_CATS,customBg,onSetCustomBg,onClearCustomBg,bgOffset,onSetBgOffset,packName}){
  const theme=getTheme(recipe.categories);
  const visual=getCardVisual(recipe,spiritCats);
  const displayVisual=customBg?{...visual,bgImage:customBg}:visual;
  const [posEditMode,setPosEditMode]=useState(false);
  const [localOffset,setLocalOffset]=useState(bgOffset||{x:50,y:50});
  useEffect(()=>{setLocalOffset(bgOffset||{x:50,y:50});},[bgOffset]);
  const posStartRef=useRef(null);
  const heroBgPos=posEditMode?`${localOffset.x}% ${localOffset.y}%`:(bgOffset?`${bgOffset.x}% ${bgOffset.y}%`:"center");
  const onPosPointerDown=e=>{posStartRef.current={x:e.clientX,y:e.clientY,ox:localOffset.x,oy:localOffset.y};e.currentTarget.setPointerCapture(e.pointerId);};
  const onPosPointerMove=e=>{if(!posStartRef.current)return;const dx=e.clientX-posStartRef.current.x;const dy=e.clientY-posStartRef.current.y;setLocalOffset({x:Math.max(0,Math.min(100,posStartRef.current.ox-dx*0.4)),y:Math.max(0,Math.min(100,posStartRef.current.oy-dy*0.4))});};
  const onPosPointerUp=()=>{posStartRef.current=null;};
  const [steps,setSteps]=useState(recipe.steps);
  const [generating,setGenerating]=useState(false);
  const [genErr,setGenErr]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [hoverStar,setHoverStar]=useState(0);
  const [localRating,setLocalRating]=useState(recipe.rating);
  useEffect(()=>setLocalRating(recipe.rating),[recipe.rating]);
  const [noteVal,setNoteVal]=useState(recipe.notes||"");
  const [editingNote,setEditingNote]=useState(false);
  const [sharing,setSharing]=useState(false);
  const [checked,setChecked]=useState(new Set());
  const [qty,setQty]=useState(1);
  const scaleIng=useCallback((ing,q)=>{
    if(q===1)return ing;
    const FRAC={"½":0.5,"¼":0.25,"¾":0.75,"⅓":1/3,"⅔":2/3};
    return ing.replace(/^([\d]+(?:[.,][\d]+)?(?:\/[\d]+)?|[½¼¾⅓⅔])\s*/,(match,num)=>{
      const n=FRAC[num]!==undefined?FRAC[num]:parseFloat(num.replace(",",".").replace(/(\d+)\/(\d+)/,(_,a,b)=>a/b));
      if(isNaN(n))return match;
      const s=Math.round(n*q*10)/10;
      return s+' ';
    });
  },[]);
  const toggleCheck=i=>setChecked(p=>{const n=new Set(p);n.has(i)?n.delete(i):n.add(i);return n;});
  const noteRef=useRef();
  const shareCardRef=useRef();

  const shareAsImage=useCallback(async()=>{
    if(!shareCardRef.current||sharing)return;
    setSharing(true);
    try{
      // carregado sob demanda — html2canvas só é necessário ao compartilhar
      const html2canvas=(await import("html2canvas")).default;
      const canvas=await html2canvas(shareCardRef.current,{backgroundColor:null,scale:2,logging:false,useCORS:true});
      const blob=await new Promise(res=>canvas.toBlob(res,"image/png"));
      if(blob){
        const file=new File([blob],`${recipe.name.toLowerCase().replace(/\s+/g,"-")}.png`,{type:"image/png"});
        let shared=false;
        if(navigator.canShare&&navigator.canShare({files:[file]})){
          try{await navigator.share({files:[file],title:recipe.name});shared=true;}
          catch(err){if(err?.name==="AbortError")shared=true;}
        }
        if(!shared){
          // fallback: baixa a imagem quando o share não está disponível ou falhou
          const url=URL.createObjectURL(blob);
          const a=document.createElement("a");
          a.href=url;a.download=file.name;a.click();
          setTimeout(()=>URL.revokeObjectURL(url),1000);
        }
      }
    }catch{}
    setSharing(false);
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
  const spiritTags=recipe.categories.filter(c=>spiritCats.has(c));

  return(
    <div className="otr-modal-backdrop" onClick={posEditMode?undefined:onClose} style={{position:"fixed",inset:0,background:posEditMode?"rgba(0,0,0,0.88)":"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10000,padding:20,backdropFilter:"blur(12px)"}}>
      {posEditMode&&customBg&&<div style={{position:"absolute",inset:0,backgroundImage:`url('${customBg}')`,backgroundSize:"cover",backgroundPosition:heroBgPos,opacity:0.2,pointerEvents:"none"}}/>}
      <div className="otr-modal-sheet" onClick={e=>e.stopPropagation()} style={{background:"#0A0906",border:`1px solid ${theme.border}22`,borderRadius:6,width:"100%",maxWidth:580,maxHeight:"90vh",overflowX:"hidden",overflowY:"auto",boxShadow:`0 32px 80px rgba(0,0,0,0.85), 0 0 40px ${theme.accent}10`,position:"relative"}}>

        {/* ── HERO + PROFILE wrapper — shared bg image fades through profile to yellow line ── */}
        <div
          style={{position:"relative",backgroundColor:"#0A0906",borderRadius:"6px 6px 0 0",overflow:"hidden",flexShrink:0,cursor:posEditMode?"crosshair":"default",touchAction:posEditMode?"none":"auto"}}
          onPointerDown={posEditMode?onPosPointerDown:undefined}
          onPointerMove={posEditMode?onPosPointerMove:undefined}
          onPointerUp={posEditMode?onPosPointerUp:undefined}
          onPointerCancel={posEditMode?onPosPointerUp:undefined}
        >
          {/* foto do hero — assenta com zoom ao abrir e segue com movimento
              lento de câmera; fica estática no modo de reposicionamento */}
          <div className={posEditMode?undefined:"otr-hero-live"} style={{position:"absolute",inset:0,...buildCardBgEditorial(displayVisual,heroBgPos)}}/>
          {/* gradient fades bg image from hero through profile section, fully solid at yellow line */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(6,4,2,0.1) 0%, rgba(6,4,2,0.0) 22%, rgba(6,4,2,0.45) 52%, rgba(10,9,6,0.78) 72%, rgba(10,9,6,1.0) 90%)",opacity:posEditMode?0.3:1,pointerEvents:"none",transition:"opacity .25s"}}/>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 75% at 50% 50%, transparent 28%, rgba(0,0,0,0.88) 100%)",mixBlendMode:"multiply",opacity:posEditMode?0.25:1,pointerEvents:"none",transition:"opacity .25s"}}/>

          {/* hero content area */}
          <div style={{position:"relative",height:220,zIndex:1}}>
            <button onClick={onClose} style={{position:"absolute",top:12,right:12,width:28,height:28,borderRadius:3,border:"1px solid rgba(240,235,225,0.12)",background:"rgba(0,0,0,0.45)",color:"rgba(240,235,225,0.5)",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>×</button>
            {customBg&&(posEditMode?(
              <button onClick={()=>{setPosEditMode(false);onSetBgOffset?.(localOffset);}} style={{position:"absolute",top:12,left:12,width:28,height:28,borderRadius:3,border:`1px solid ${theme.accent}55`,background:`${theme.accent}22`,color:theme.accent,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>✓</button>
            ):(
              <button onClick={()=>setPosEditMode(true)} style={{position:"absolute",top:12,left:12,width:28,height:28,borderRadius:3,border:"1px solid rgba(240,235,225,0.12)",background:"rgba(0,0,0,0.45)",color:"rgba(240,235,225,0.5)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 15 22 12 19 9"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
              </button>
            ))}
            {recipe.custom&&<div style={{position:"absolute",top:42,left:18,display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px 3px 8px",borderRadius:20,background:"rgba(120,85,40,0.18)",border:"1px solid rgba(200,160,90,0.28)",boxShadow:"0 0 14px rgba(160,120,60,0.22)"}}>
              <span style={{fontSize:8,color:"#C8A96E",opacity:0.8,lineHeight:1}}>◆</span>
              <span style={{fontSize:7.5,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(200,160,90,0.75)",fontWeight:600,fontFamily:"Archivo,sans-serif"}}>autoral</span>
            </div>}
            {posEditMode?(
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,pointerEvents:"none",zIndex:5}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(240,235,225,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 15 22 12 19 9"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                <span style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.45)",fontFamily:"Archivo,sans-serif"}}>arraste para reposicionar</span>
              </div>
            ):(
              <div style={{position:"absolute",bottom:16,left:18,right:18}}>
                {styleTags[0]&&<div style={{...CARD_TYPO.heroEyebrow,color:theme.accent,opacity:0.8,marginBottom:6}}>{styleTags[0]}</div>}
                <div style={{fontFamily:"'Gloock',serif",fontSize:recipe.name.length>18?22:recipe.name.length>14?26:recipe.name.length>11?28:recipe.name.length>7?32:36,fontWeight:400,lineHeight:1.15,color:"rgba(231,224,205,0.97)",letterSpacing:"-0.3px",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{recipe.name}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                  <div style={{height:2,width:36,background:theme.accent,borderRadius:2,opacity:0.9}}/>
                  <div style={{width:7,height:2,borderRadius:1,background:theme.accent,opacity:0.9}}/>
                </div>
                {packName&&<div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:7,padding:"2px 9px 2px 7px",borderRadius:20,background:"rgba(0,0,0,0.35)",border:`1px solid ${theme.accent}44`,backdropFilter:"blur(4px)"}}>
                  <span style={{fontSize:7,color:theme.accent,opacity:0.85,lineHeight:1}}>◈</span>
                  <span style={{fontSize:7.5,letterSpacing:1.5,textTransform:"uppercase",color:`${theme.accent}BB`,fontFamily:"Archivo,sans-serif",fontWeight:600}}>{packName}</span>
                </div>}
                {recipe.signature&&<div style={{fontSize:11,fontStyle:"italic",color:"rgba(231,224,205,0.55)",marginTop:5,letterSpacing:0.3}}>{recipe.signature}</div>}
                {profile?.flavors&&<div style={{...CARD_TYPO.flavor,color:theme.accent,marginTop:6}}>{profile.flavors.replace(/·/g,"•")}</div>}
              </div>
            )}
          </div>

          {/* profile section — transparent bg, image bleeds through from hero above */}
          {profile?.perfil&&(
            <div style={{position:"relative",zIndex:1,filter:posEditMode?"blur(2px) brightness(0.25)":"none",transition:"filter .25s",pointerEvents:posEditMode?"none":"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"9px 18px 8px"}}>
                {[["◈","Perfil",profile.perfil],["❋","Sensação",profile.sensacao],["✦","Ocasião",profile.ocasiao]].map((item,i)=>(
                  <div key={i} style={{display:"contents"}}>
                    {i>0&&<div style={{width:1,alignSelf:"stretch",background:`linear-gradient(to bottom,${theme.accent}65,${theme.accent}18)`,flexShrink:0,margin:"0 2px"}}/>}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1}}>
                      <span style={{...CARD_TYPO.sigIcon,color:theme.accent,textShadow:`0 0 8px ${theme.accent}88`}}>{item[0]}</span>
                      <span style={CARD_TYPO.sigLabel}>{item[1]}</span>
                      <span style={{...CARD_TYPO.sigValue,fontSize:8}}>{item[2]}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{height:1,background:`linear-gradient(90deg,transparent,${theme.accent}55,transparent)`,margin:"0 18px"}}/>
            </div>
          )}
        </div>

        <div style={{padding:"16px 18px 32px",textAlign:"left",filter:posEditMode?"blur(2px) brightness(0.25)":"none",transition:"filter .25s",pointerEvents:posEditMode?"none":"auto"}}>

          {/* estrelas + ações */}
          <div style={{display:"flex",gap:2,marginBottom:isTried&&recipe.rating===0?4:12,alignItems:"center"}}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onMouseEnter={()=>setHoverStar(n)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>{const r=n===localRating?0:n;setLocalRating(r);onRating(r);setHoverStar(r);}} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:n<=(hoverStar||localRating)?theme.accent:"rgba(240,235,225,0.1)",transition:"color .1s",padding:"2px 3px"}}>★</button>
            ))}
          </div>
          {isTried&&recipe.rating===0&&<div style={{fontSize:10,color:theme.accent,opacity:.55,letterSpacing:1,marginBottom:12}}>como você avaliaria?</div>}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
            {(()=>{
              const btnBase={...CARD_TYPO.actionBtn,display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:20,cursor:"pointer",transition:"all .15s",lineHeight:1,boxSizing:"border-box"};
              const dimBorder=`1px solid ${theme.accent}33`;
              const dimColor=`${theme.accent}66`;
              return(<>
                <button onClick={onTried} style={{...btnBase,background:isTried?"rgba(74,222,128,0.08)":"transparent",border:isTried?"1px solid rgba(74,222,128,0.4)":dimBorder,color:isTried?"#4ADE80":dimColor}}>
                  <svg width="11" height="9" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 5 4.5 8.5 11 1.5"/></svg>
                  já provei
                </button>
                <button onClick={onFav} style={{...btnBase,background:isFav?`${theme.accent}14`:"transparent",border:isFav?`1px solid ${theme.accent}`:dimBorder,color:isFav?theme.accent:dimColor}}>
                  <svg width="11" height="10" viewBox="0 0 20 18" fill={isFav?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><path d="M10 16.5C10 16.5 1 10 1 5C1 2.8 2.8 1 5.5 1C7.5 1 9 2.3 10 4C11 2.3 12.5 1 14.5 1C17.2 1 19 2.8 19 5C19 10 10 16.5 10 16.5z"/></svg>
                  favorita
                </button>
                <button onClick={onComanda} style={{...btnBase,background:isComanda?"rgba(200,169,110,0.12)":"transparent",border:isComanda?"1px solid rgba(200,169,110,0.5)":dimBorder,color:isComanda?"#C8A96E":dimColor}}>
                  <svg width="10" height="13" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2 L14 2 L8.5 10 L8.5 17"/><line x1="5.5" y1="17" x2="11.5" y2="17"/><circle cx="8.5" cy="5.5" r="1.5" fill="currentColor" opacity="0.7" stroke="none"/></svg>
                  comanda
                </button>
                <button onClick={shareAsImage} disabled={sharing} style={{...btnBase,background:"transparent",border:dimBorder,color:sharing?`${theme.accent}33`:dimColor,cursor:sharing?"default":"pointer"}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  compartilhar
                </button>
                <button onClick={onEdit} style={{...btnBase,background:"transparent",border:dimBorder,color:dimColor}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  editar
                </button>
                {customBg?(
                  <button onClick={onClearCustomBg} style={{...btnBase,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#F87171"}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    excluir foto
                  </button>
                ):(onSetCustomBg&&(
                  <label style={{...btnBase,background:"transparent",border:dimBorder,color:dimColor,cursor:"pointer"}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    trocar foto
                    <input type="file" accept="image/*" style={{display:"none"}}
                      onChange={async e=>{const f=e.target.files?.[0];if(f){const url=await resizeImageToDataUrl(f);if(url)onSetCustomBg(url);}e.target.value="";}}/>
                  </label>
                ))}
              </>);
            })()}
          </div>

          {/* divisor */}
          <div style={{height:1,background:`linear-gradient(90deg,${theme.accent}44,transparent)`,marginBottom:22}}/>

          {recipe.servings&&recipe.servings!=="1"&&<div style={{fontSize:12,color:"rgba(240,235,225,0.48)",fontStyle:"italic",marginBottom:18}}>rende {recipe.servings}</div>}

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{...CARD_TYPO.sectionHead,color:theme.accent}}>Ingredientes</div>
            <div style={{display:"flex",alignItems:"center",gap:0,border:`1px solid ${theme.border}44`,borderRadius:20,overflow:"hidden"}}>
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:28,height:26,background:"none",border:"none",color:qty>1?theme.accent:"rgba(240,235,225,0.2)",fontSize:16,cursor:qty>1?"pointer":"default",lineHeight:1}}>−</button>
              <span style={{fontSize:11,color:theme.accent,fontWeight:700,minWidth:28,textAlign:"center",letterSpacing:.5}}>{qty}×</span>
              <button onClick={()=>setQty(q=>Math.min(10,q+1))} style={{width:28,height:26,background:"none",border:"none",color:theme.accent,fontSize:16,cursor:"pointer",lineHeight:1}}>+</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:1,marginBottom:26}}>
            {recipe.ingredients.map((ing,i)=>{
              const done=checked.has(i);
              const scaled=scaleIng(ing,qty);
              const parts=splitMeasure(scaled);
              return(
                <div key={i} onClick={()=>toggleCheck(i)} style={{display:"flex",gap:10,alignItems:"center",padding:"4px 10px",borderRadius:4,cursor:"pointer",background:done?"rgba(240,235,225,0.02)":"transparent",transition:"all .15s"}}>
                  <div style={{width:16,height:16,borderRadius:3,border:`1px solid ${done?theme.accent+"66":"rgba(240,235,225,0.15)"}`,background:done?theme.accent+"22":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                    {done&&<span style={{fontSize:10,color:theme.accent,lineHeight:1}}>✓</span>}
                  </div>
                  {parts?(
                    <span style={{flex:1,minWidth:0,display:"flex",alignItems:"baseline",gap:8}}>
                      <span style={{...CARD_TYPO.bodyText,color:done?"rgba(240,235,225,0.2)":"rgba(231,224,205,0.70)",textDecoration:done?"line-through":"none",transition:"all .15s"}}>{capFirst(parts.name)}</span>
                      <span aria-hidden="true" style={{flex:1,minWidth:14,borderBottom:`1px dotted ${done?"rgba(231,224,205,0.10)":"rgba(231,224,205,0.22)"}`,transform:"translateY(-4px)"}}/>
                      <span style={{...CARD_TYPO.bodyText,whiteSpace:"nowrap",color:done?"rgba(240,235,225,0.2)":theme.label,textDecoration:done?"line-through":"none",transition:"all .15s"}}>{parts.amount}</span>
                    </span>
                  ):(
                    <span style={{...CARD_TYPO.bodyText,color:done?"rgba(240,235,225,0.2)":"rgba(231,224,205,0.70)",textDecoration:done?"line-through":"none",transition:"all .15s"}}>{capFirst(scaled)}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{...CARD_TYPO.sectionHead,color:theme.accent}}>Modo de preparo</div>
            {steps.length===0&&!generating&&<button onClick={generateSteps} style={{padding:"3px 12px",borderRadius:20,fontSize:10,background:theme.accent+"16",border:`1px solid ${theme.accent}44`,color:theme.accent,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>✦ gerar com IA</button>}
            {generating&&<span style={{fontSize:11,color:theme.accent,opacity:.5,fontStyle:"italic"}}>gerando…</span>}
          </div>
          {genErr&&<p style={{fontSize:12,color:"#F87171",marginBottom:12}}>{genErr}</p>}

          {steps.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:13,marginBottom:26}}>
              {steps.map((s,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"24px 1fr",gap:12,alignItems:"start"}}>
                  <div style={{width:24,height:24,borderRadius:3,border:`1px solid ${theme.border}`,color:theme.label,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                  <div style={{...CARD_TYPO.bodyText,paddingTop:2}}>{capFirst(s)}</div>
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
                <div style={CARD_TYPO.noteText}>{noteVal}</div>
              </div>
            ) : (
              <button onClick={()=>setEditingNote(true)} style={{background:"none",border:"none",padding:0,color:"rgba(240,235,225,0.42)",fontSize:11,letterSpacing:1.5,textTransform:"uppercase",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>+ adicionar nota</button>
            )}
          </div>

          <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(240,235,225,0.11)",display:"flex",flexDirection:"column",gap:8}}>
            {onRepo&&(
              <button onClick={onRepo} style={{background:"none",border:"1px solid rgba(160,120,90,0.25)",borderRadius:3,padding:"4px 12px",color:"rgba(160,120,90,0.7)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif",alignSelf:"flex-start"}}>↺ Recuperar receita original</button>
            )}
            {!confirmDelete?(
              <button onClick={()=>setConfirmDelete(true)} style={{background:"none",border:"1px solid rgba(239,68,68,0.25)",borderRadius:3,padding:"4px 12px",color:"rgba(239,68,68,0.70)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif",alignSelf:"flex-start"}}>excluir receita</button>
            ):(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:12,color:"rgba(240,235,225,0.4)"}}>Tem certeza?</span>
                <button onClick={onDelete} style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:3,padding:"5px 14px",color:"#F87171",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>sim, excluir</button>
                <button onClick={()=>setConfirmDelete(false)} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:3,padding:"5px 12px",color:"rgba(240,235,225,0.52)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>cancelar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* card oculto para captura de imagem */}
      <div ref={shareCardRef} style={{position:"fixed",left:-9999,top:-9999,width:360,background:"#0A0906",borderRadius:12,fontFamily:"Archivo,sans-serif",overflow:"hidden",border:`1.5px solid ${theme.accent}55`,boxShadow:`0 0 32px ${theme.accent}22`}}>
        {/* hero zone — bg editorial + camadas atmosféricas */}
        <div style={{position:"relative",height:222,backgroundColor:"#0A0906",...buildCardBgEditorial(visual,"center")}}>
          {/* gradient cinemático */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(3,1,0,0.3) 0%, rgba(3,1,0,0) 22%, rgba(3,1,0,0.45) 56%, rgba(3,1,0,0.97) 100%)"}}/>
          {/* vinheta */}
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 75% at 50% 50%, transparent 28%, rgba(0,0,0,0.88) 100%)",mixBlendMode:"multiply"}}/>
          {/* luz de vidro no topo */}
          <div style={{position:"absolute",top:0,left:0,right:0,height:"45%",background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.07) 0%, transparent 70%)"}}/>
          {/* neon — canto inferior esquerdo */}
          <div style={{position:"absolute",inset:0,borderRadius:12,mixBlendMode:"screen",
            background:`radial-gradient(ellipse 75% 42% at -10% 108%, ${theme.accent} 0%, ${theme.accent}aa 5%, ${theme.accent}55 21%, ${theme.accent}1c 45%, transparent 68%)`
          }}/>
          {/* wordmark */}
          <div style={{position:"absolute",top:14,left:16,fontSize:12,letterSpacing:4,textTransform:"uppercase",fontWeight:900,fontFamily:"Archivo,sans-serif",color:"rgba(240,235,225,0.92)",textShadow:"0 1px 6px rgba(0,0,0,0.9), 0 2px 20px rgba(0,0,0,0.75)"}}>ON THE ROCKS</div>
          {/* foto do usuário — canto superior direito */}
          {customBg&&(
            <div style={{position:"absolute",top:12,right:12,width:68,height:76,borderRadius:5,
              backgroundImage:`url('${customBg}')`,backgroundSize:"cover",backgroundPosition:"center",
              border:`1.5px solid ${theme.accent}88`,
              boxShadow:`0 0 16px ${theme.accent}44, 0 2px 14px rgba(0,0,0,0.75)`,
              overflow:"hidden"}}/>
          )}
          {/* nome + divider + flavor */}
          <div style={{position:"absolute",bottom:16,left:16,right:customBg?92:16}}>
            {styleTags[0]&&<div style={{fontSize:7.5,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.5)",marginBottom:5,textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>{styleTags[0]}</div>}
            {(recipe.custom||recipe.adjusted)&&<div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
              <span style={{width:10,height:1,background:theme.accent,display:"inline-block",opacity:0.8}}/>
              <span style={{fontSize:7,letterSpacing:2,textTransform:"uppercase",color:theme.accent,opacity:.8}}>{recipe.custom?"AUTORAL":"AJUSTADA"}</span>
            </div>}
            <div style={{fontFamily:"'Gloock',serif",fontSize:recipe.name.length>18?20:recipe.name.length>14?24:recipe.name.length>10?28:32,fontWeight:400,lineHeight:1.18,color:"rgba(231,224,205,0.97)",letterSpacing:"-0.3px",textShadow:"0 1px 8px rgba(0,0,0,0.8)"}}>{recipe.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:7}}>
              <div style={{height:2,width:28,background:theme.accent,borderRadius:2,opacity:0.88}}/>
              <div style={{width:5,height:2,borderRadius:1,background:theme.accent,opacity:0.88}}/>
              {profile?.flavors&&<span style={{...CARD_TYPO.flavor,color:theme.accent,fontSize:7.5,opacity:.82}}>{profile.flavors.replace(/·/g,"•")}</span>}
            </div>
          </div>
        </div>
        {/* perfil */}
        {profile?.perfil&&(
          <div style={{borderBottom:`1px solid ${theme.accent}22`,padding:"9px 16px 10px"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              {[["◈","Perfil",profile.perfil],["❋","Sensação",profile.sensacao],["✦","Ocasião",profile.ocasiao]].map((item,i)=>(
                <div key={i} style={{display:"contents"}}>
                  {i>0&&<div style={{width:1,alignSelf:"stretch",background:`linear-gradient(to bottom,${theme.accent}65,${theme.accent}18)`,flexShrink:0,margin:"0 2px"}}/>}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1}}>
                    <span style={{...CARD_TYPO.sigIcon,color:theme.accent,textShadow:`0 0 8px ${theme.accent}88`}}>{item[0]}</span>
                    <span style={CARD_TYPO.sigLabel}>{item[1]}</span>
                    <span style={{...CARD_TYPO.sigValue,fontSize:7}}>{item[2]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ingredientes */}
        <div style={{padding:"12px 16px 10px"}}>
          <div style={{fontSize:7.5,letterSpacing:2.5,textTransform:"uppercase",color:theme.accent,opacity:.5,marginBottom:8}}>Ingredientes</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {recipe.ingredients.slice(0,9).map((ing,i)=>(
              <div key={i} style={{display:"flex",gap:9,alignItems:"baseline"}}>
                <div style={{width:3,height:3,borderRadius:"50%",background:theme.accent,opacity:.42,flexShrink:0,marginTop:7}}/>
                <span style={{fontSize:11.5,color:"rgba(240,235,225,0.6)",lineHeight:1.4}}>{ing}</span>
              </div>
            ))}
          </div>
        </div>
        {/* rodapé */}
        <div style={{padding:"8px 16px 13px",borderTop:`1px solid ${theme.accent}15`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:11,color:n<=recipe.rating?theme.accent:"rgba(240,235,225,0.1)"}}>★</span>)}</div>
          <div style={{fontSize:7,letterSpacing:2.5,color:"rgba(240,235,225,0.28)",textTransform:"uppercase"}}>on-the-rocks.app</div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function SidebarContent({sidebarTab,setSidebarTab,allRecipes,activeStyle,setActiveStyle,allSpirits,visibleSpirits,owned,toggleOwned,filterMode,setFilterMode,activeSpirits,toggleSpirit,activeOccasions,toggleOccasion,spiritSearch,setSpiritSearch,hasFilters,clearAll,customSpirits,setCustomSpirits,setMobileTab}){
  const [newSpirit,setNewSpirit]=useState("");
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",borderBottom:"1px solid rgba(240,235,225,0.11)",marginBottom:16}}>
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
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,paddingLeft:2}}>
              <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700}}>Ocasião</div>
              {activeOccasions.length>0&&<button onClick={()=>{setMobileTab&&setMobileTab("explorar");clearAll();}} style={{fontSize:8,color:"rgba(240,235,225,0.28)",background:"none",border:"none",cursor:"pointer",letterSpacing:1,fontFamily:"Archivo,sans-serif",padding:0}}>limpar ×</button>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {[...OCCASION_LIST].sort((a,b)=>a.localeCompare(b,"pt")).map(tag=>{
                const active=activeOccasions.includes(tag);
                return(<button key={tag} onClick={()=>{toggleOccasion(tag);if(setMobileTab)setMobileTab("explorar");}} style={{padding:"4px 10px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .12s",background:active?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${active?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,color:active?"#C8A96E":"rgba(240,235,225,0.45)"}}>{tag}</button>);
              })}
            </div>
          </div>
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700,marginBottom:7}}>Tenho em casa</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:9,maxHeight:95,overflowY:"auto"}}>
            {allSpirits.map(s=>(
              <button key={s} onClick={()=>toggleOwned(s)} style={{padding:"3px 8px",borderRadius:20,fontSize:10,background:owned.includes(s)?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${owned.includes(s)?"rgba(160,120,90,0.44)":"rgba(240,235,225,0.08)"}`,color:owned.includes(s)?"#A0785A":"rgba(240,235,225,0.48)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s}</button>
            ))}
          </div>
          <div style={{borderTop:"1px solid rgba(240,235,225,0.11)",paddingTop:11,marginBottom:7}}>
            <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700,marginBottom:6}}>Filtrar por spirit</div>
            <input value={spiritSearch} onChange={e=>setSpiritSearch(e.target.value)} placeholder="buscar…" style={{width:"100%",background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.15)",borderRadius:3,padding:"7px 10px",color:"#F0EBE1",fontSize:12,marginBottom:7,outline:"none",fontFamily:"Archivo,sans-serif"}}/>
          </div>
          {activeSpirits.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:7}}>{activeSpirits.map(s=><button key={s} onClick={()=>toggleSpirit(s)} style={{padding:"3px 8px",borderRadius:20,fontSize:10,background:"rgba(160,120,90,0.12)",border:"1px solid rgba(160,120,90,0.4)",color:"#A0785A",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s} ×</button>)}</div>}
          <div style={{flex:1,overflowY:"auto"}}>
            {visibleSpirits.map(s=>{
              const count=allRecipes.filter(r=>r.categories.includes(s)).length;
              const active=activeSpirits.includes(s);
              return(<button key={s} onClick={()=>{toggleSpirit(s);if(!active&&setMobileTab)setMobileTab("explorar");}} style={{display:"flex",justifyContent:"space-between",width:"100%",padding:"7px 10px",borderRadius:3,marginBottom:2,background:active?"rgba(160,120,90,0.07)":"transparent",border:`1px solid ${active?"rgba(160,120,90,0.28)":"transparent"}`,color:active?"#A0785A":"rgba(240,235,225,0.38)",fontSize:12,cursor:"pointer",textAlign:"left",transition:"all .1s",fontFamily:"Archivo,sans-serif"}}><span>{s}</span><span style={{fontSize:10,opacity:.3}}>{count}</span></button>);
            })}
          </div>
          <div style={{borderTop:"1px solid rgba(240,235,225,0.11)",paddingTop:10,marginTop:8,flexShrink:0}}>
            <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.4)",fontWeight:700,marginBottom:6}}>Adicionar bebida</div>
            <div style={{display:"flex",gap:5}}>
              <input value={newSpirit} onChange={e=>setNewSpirit(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newSpirit.trim()){setCustomSpirits(p=>[...new Set([...p,newSpirit.trim()])]);setNewSpirit("");}}} placeholder="ex: Fernet…" style={{flex:1,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.15)",borderRadius:3,padding:"6px 9px",color:"#F0EBE1",fontSize:12,outline:"none",fontFamily:"Archivo,sans-serif"}}/>
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
      {hasFilters&&filterMode!=="tenho"&&<button onClick={clearAll} style={{marginTop:8,padding:"7px 0",background:"none",flexShrink:0,border:"1px solid rgba(240,235,225,0.13)",borderRadius:3,color:"rgba(240,235,225,0.38)",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>limpar filtros</button>}
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function resizeImageToDataUrl(file,maxW=800,maxH=1200,quality=0.75){
  return new Promise(resolve=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      let w=img.width,h=img.height;
      const ratio=Math.min(maxW/w,maxH/h,1);
      w=Math.round(w*ratio);h=Math.round(h*ratio);
      const canvas=document.createElement("canvas");
      canvas.width=w;canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg",quality));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};
    img.src=url;
  });
}

// ─── SWIPE CARD ───────────────────────────────────────────────────────────────
function SwipeCard({recipe,onComanda,isComanda,onTried,isTried,onNext,onPrev,hasPrev,onOpen,profile,onDragChange,spiritCats=SPIRIT_CATS,customBg,onSetCustomBg,onClearCustomBg,packName}){
  const theme=getTheme(recipe.categories);
  const visual=getCardVisual(recipe,spiritCats);
  const displayVisual=customBg?{...visual,bgImage:customBg}:visual;
  const styleTag=recipe.categories.find(c=>STYLE_CATS.has(c));
  const spiritTag=recipe.categories.find(c=>spiritCats.has(c));
  const [drag,setDrag]=useState(0);
  const [dragging,setDragging]=useState(false);
  const [gone,setGone]=useState(null);
  const [visible,setVisible]=useState(false);
  const startX=useRef(0);
  const cardRef=useRef();

  useEffect(()=>{const id=requestAnimationFrame(()=>setVisible(true));return()=>cancelAnimationFrame(id);},[]);

  const THRESH=38;
  const onPointerDown=e=>{startX.current=e.clientX;setDragging(true);cardRef.current?.setPointerCapture(e.pointerId);};
  const onPointerMove=e=>{
    if(!dragging)return;
    const d=e.clientX-startX.current;
    setDrag(d);
    onDragChange?.({nextPct:Math.max(0,Math.min(1,-d/THRESH)),prevPct:Math.max(0,Math.min(1,d/THRESH))});
  };
  const onPointerUp=()=>{
    if(!dragging)return;
    setDragging(false);
    if(drag<-THRESH){setGone("left");setTimeout(()=>{onNext();setGone(null);setDrag(0);},300);}
    else if(drag>THRESH&&hasPrev){setGone("right");setTimeout(()=>{onPrev();setGone(null);setDrag(0);},300);}
    else{setDrag(0);onDragChange?.({nextPct:0,prevPct:0});if(Math.abs(drag)<6)onOpen(recipe);}
  };

  const activeDrag=gone==="left"?-420:gone==="right"?420:drag;
  const rotate=activeDrag/13;
  const scale=dragging?Math.max(0.97,1-Math.abs(drag)*0.0003):1;
  const nextPct=Math.max(0,Math.min(1,-activeDrag/THRESH));
  const prevPct=Math.max(0,Math.min(1,activeDrag/THRESH));
  const p=profile&&typeof profile==="object"?profile:null;

  return(
    <div style={{position:"relative",width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"7% 16px 112px",userSelect:"none"}}>

      {/* card */}
      <div className="disc-card" style={{position:"relative",zIndex:1,width:"100%",maxWidth:285,height:"100%",
        opacity:visible?1:0,
        transition:"opacity 0.4s ease"}}>

        <div ref={cardRef}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={{
            width:"100%",height:"100%",
            backgroundColor:"#0A0906",
            ...buildCardBgEditorial(displayVisual),
            borderRadius:16,position:"relative",overflow:"hidden",
            cursor:dragging?"grabbing":"pointer",
            transform:`translateX(${activeDrag}px) rotate(${rotate}deg) scale(${scale})`,
            transition:dragging?"none":gone?"transform .3s cubic-bezier(.4,0,.6,1)":"transform .38s cubic-bezier(.34,1.56,.64,1)",
            boxShadow:`0 2px 6px rgba(0,0,0,0.9), 0 8px 18px rgba(0,0,0,0.75), 0 0 28px ${theme.accent}12, 0 0 8px ${theme.accent}18`,
            border:`1.5px solid ${theme.accent}`,
            touchAction:"none",
          }}>

          {/* gradient overlay — cinematic */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(3,1,0,0.28) 0%, rgba(3,1,0,0.0) 22%, rgba(3,1,0,0.42) 55%, rgba(3,1,0,0.92) 100%)",pointerEvents:"none",zIndex:1}}/>
          {/* vinheta — escurece bordas e laterais */}
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 75% at 50% 50%, transparent 28%, rgba(0,0,0,0.88) 100%)",mixBlendMode:"multiply",pointerEvents:"none",zIndex:2}}/>
          {/* luz atmosférica no topo — efeito vidro */}
          <div style={{position:"absolute",top:0,left:0,right:0,height:"45%",background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.07) 0%, transparent 70%)",pointerEvents:"none",zIndex:3}}/>
          {/* neon edge — canto inferior esquerdo */}
          <div style={{position:"absolute",inset:0,borderRadius:16,pointerEvents:"none",zIndex:4,mixBlendMode:"screen",
            background:`radial-gradient(ellipse 75% 42% at -10% 105%, ${theme.accent} 0%, ${theme.accent}aa 5%, ${theme.accent}55 21%, ${theme.accent}1c 45%, ${theme.accent}07 60%, transparent 72%)`
          }}/>

          {/* particles */}
          {visual.particleClass&&<div className={visual.particleClass} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:3}}/>}

          {/* drag overlay: next */}
          <div style={{position:"absolute",inset:0,borderRadius:16,background:"linear-gradient(to right,rgba(240,235,225,0.07),transparent)",opacity:nextPct,pointerEvents:"none",zIndex:10}}/>
          {/* drag overlay: prev */}
          {hasPrev&&<div style={{position:"absolute",inset:0,borderRadius:16,background:`linear-gradient(to left,${theme.accent}1a,transparent)`,opacity:prevPct,pointerEvents:"none",zIndex:10}}/>}

          {/* content */}
          <div style={{position:"absolute",inset:0,zIndex:5,userSelect:"none"}}>

            {/* top row */}
            <div style={{position:"absolute",top:18,left:20,right:20,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              {styleTag&&<span style={CARD_TYPO.tag}>{styleTag}</span>}
              {spiritTag&&<span style={{...CARD_TYPO.tag,display:"flex",alignItems:"center",gap:5,flexShrink:1,minWidth:0}}>
                <span style={{width:4,height:4,borderRadius:"50%",background:theme.accent,flexShrink:0,display:"inline-block"}}/>
                <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{spiritTag}</span>
              </span>}
            </div>


            {/* autoral seal */}
            {recipe.custom&&(
              <div style={{position:"absolute",top:48,left:20,display:"inline-flex",alignItems:"center",gap:5,
                padding:"3px 10px 3px 8px",borderRadius:20,
                background:"rgba(120,85,40,0.22)",border:"1px solid rgba(200,160,90,0.45)",
                filter:"drop-shadow(0 0 8px rgba(200,160,90,0.55)) drop-shadow(0 1px 3px rgba(0,0,0,0.7))"}}>
                <span style={{fontSize:8,color:"#C8A96E",lineHeight:1}}>◆</span>
                <span style={{fontSize:7.5,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(200,160,90,0.92)",fontWeight:600,fontFamily:"Archivo,sans-serif"}}>autoral</span>
              </div>
            )}

            {/* bottom content */}
            <div style={{position:"absolute",top:72,bottom:24,left:20,right:20,display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:11,textAlign:"left",overflow:"hidden"}}>
              <div style={{fontFamily:"'Gloock',serif",
                fontSize:(()=>{const n=recipe.name.length;const hasP=!!(p?.perfil||p?.flavors);return hasP?(n>22?22:n>18?26:n>14?30:n>10?33:n>7?38:42):(n>22?26:n>18?30:n>14?35:n>10?38:n>7?48:55);})(),
                fontWeight:400,lineHeight:1.15,color:"rgba(231,224,205,0.97)",letterSpacing:"-0.3px",
                overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",paddingBottom:2,
                flexShrink:1,minHeight:0,
                textShadow:"0 1px 4px rgba(0,0,0,0.8), 0 2px 14px rgba(0,0,0,0.6)"}}>{recipe.name}</div>

              {/* divider */}
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{height:2,width:36,background:theme.accent,borderRadius:2,opacity:0.9}}/>
                <div style={{width:7,height:2,borderRadius:1,background:theme.accent,opacity:0.9}}/>
              </div>

              {/* pack badge */}
              {packName&&<div style={{display:"inline-flex",alignItems:"center",gap:4,alignSelf:"flex-start",padding:"1px 8px 1px 6px",borderRadius:20,background:"rgba(0,0,0,0.42)",border:`1px solid ${theme.accent}44`,backdropFilter:"blur(4px)"}}>
                <span style={{fontSize:7,color:theme.accent,opacity:0.85,lineHeight:1}}>◈</span>
                <span style={{fontSize:7.5,letterSpacing:1.5,textTransform:"uppercase",color:`${theme.accent}CC`,fontFamily:"Archivo,sans-serif",fontWeight:600}}>{packName}</span>
              </div>}

              {/* flavor tags — cor da família */}
              {p?.flavors&&(
                <div style={{...CARD_TYPO.flavor,color:theme.accent}}>
                  {p.flavors.replace(/·/g,"•")}
                </div>
              )}

              {/* profile row — com separadores verticais */}
              {p?.perfil&&(
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:`1.5px solid ${theme.accent}30`}}>
                  {[["◈","Perfil",p.perfil,p.perfil_desc],["❋","Sensação",p.sensacao,p.sensacao_desc],["✦","Ocasião",p.ocasiao,p.ocasiao_desc]].map((item,i)=>(
                    <div key={i} style={{display:"contents"}}>
                      {i>0&&<div style={{width:1,alignSelf:"stretch",background:`${theme.accent}28`,flexShrink:0,margin:"0 2px"}}/>}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,flex:1}}>
                        <span style={{...CARD_TYPO.sigIcon,color:theme.accent,textShadow:`0 0 8px ${theme.accent}88`}}>{item[0]}</span>
                        <span style={CARD_TYPO.sigLabel}>{item[1]}</span>
                        <span style={{...CARD_TYPO.sigValue,fontSize:item[2]?.length>10?7:item[2]?.length>7?8:9}}>{item[2]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
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
function MobileNav({ tab, setTab, favCount, onSameTab, accentColor }) {
  const items = [
    { id:"descobrir",    label:"Descobrir" },
    { id:"explorar",     label:"Explorar" },
    { id:"ingredientes", label:"Bar" },
    { id:"comanda",      label:"Comanda" },
    { id:"perfil",       label:"Perfil" },
  ];
  const navIcon = id => {
    if(id==="descobrir")    return <span style={{fontSize:17,lineHeight:1}}>◈</span>;
    if(id==="explorar")     return <span style={{fontSize:17,lineHeight:1}}>⊞</span>;
    if(id==="ingredientes") return <span style={{fontSize:17,lineHeight:1}}>⊙</span>;
    if(id==="perfil")       return <span style={{fontSize:17,lineHeight:1}}>⊛</span>;
    if(id==="comanda") return (
      <svg width="17" height="17" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4 L19 4 L11 14 Z"/>
        <line x1="11" y1="14" x2="11" y2="19"/>
        <line x1="7" y1="19" x2="15" y2="19"/>
      </svg>
    );
  };
  return (
    <nav className="mnv" style={{position:"fixed",bottom:0,left:0,right:0,background:"#080808",borderTop:"1px solid rgba(240,235,225,0.13)",zIndex:9999,paddingBottom:"env(safe-area-inset-bottom,8px)"}}>
      {accentColor&&<div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${accentColor}55 50%, transparent)`,pointerEvents:"none",transition:"background 1.1s ease"}}/>}
      {items.map(t=>(
        <button key={t.id} onClick={()=>tab===t.id ? onSameTab?.(t.id) : setTab(t.id)} style={{flex:1,padding:"10px 4px 6px",background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",color:tab===t.id?"#F0A030":"rgba(240,235,225,0.26)",transition:"color .15s",fontFamily:"Archivo,sans-serif",filter:tab===t.id?"drop-shadow(0 0 6px #F0A03088)":"none"}}>
          {navIcon(t.id)}
          <span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>{t.label}</span>
          <div style={{height:2,width:tab===t.id?18:0,borderRadius:1,background:"#F0A030",boxShadow:tab===t.id?"0 0 10px #F0A030cc, 0 0 4px #F0A030":"none",transition:"width .25s ease, box-shadow .25s ease",marginTop:2}}/>
        </button>
      ))}
    </nav>
  );
}

// ─── TUTORIAL ─────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  { icon:null,  label:null,        tab:null,            desc:"Seu caderno de bar. Receitas clássicas, técnicas e tudo que você precisa para montar um drink de verdade." },
  { icon:"◈",   label:"Descobrir", tab:"descobrir",     desc:"Deixe o acaso trabalhar. Passe o dedo para descobrir um drink aleatório — ou volte para rever o anterior." },
  { icon:"⊞",   label:"Explorar",  tab:"explorar",      desc:"Todas as receitas em um lugar. Filtre por família — Sour, Spritz, Collins — ou busque direto pelo nome ou ingrediente." },
  { icon:"⊙",   label:"Bar",       tab:"ingredientes",  desc:"Diga o que tem em casa. O app mostra os drinks que você já pode preparar agora, sem falta de ingrediente." },
  { icon:"◫",   label:"Comanda",   tab:"comanda",       desc:"Adicione drinks e veja tudo numa lista — útil pra um jantar ou uma mesa de amigos." },
  { icon:"⊛",   label:"Perfil",    tab:"perfil",        desc:"Acompanhe o que já provou, suas favoritas e avaliações. Aqui também fica o backup dos seus dados." },
];
function Tutorial({ onClose, onTabChange }) {
  const [step,setStep]=useState(0);
  const cur=TUTORIAL_STEPS[step];
  const isLast=step===TUTORIAL_STEPS.length-1;
  const isWelcome=step===0;
  useEffect(()=>{onTabChange("descobrir");window.scrollTo(0,0);},[]);
  const goTo=s=>{setStep(s);window.scrollTo(0,0);onTabChange(TUTORIAL_STEPS[s].tab||"descobrir");};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.1)",zIndex:10000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 24px 100px"}}>
      <div style={{width:"100%",maxWidth:380,background:"rgba(8,9,6,0.92)",border:"3px solid rgba(200,169,110,0.45)",borderRadius:10,padding:"24px 24px 20px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:18,boxShadow:"0 -8px 40px rgba(0,0,0,0.4)"}}>

        {/* dots */}
        <div style={{display:"flex",gap:6}}>
          {TUTORIAL_STEPS.map((_,i)=>(
            <div key={i} style={{width:i===step?22:6,height:6,borderRadius:3,background:i===step?"#C8A96E":i<step?"rgba(200,169,110,0.3)":"rgba(240,235,225,0.1)",transition:"all .3s"}}/>
          ))}
        </div>

        {/* ícone ou logo */}
        {isWelcome?(
          <div style={{marginTop:8}}>
            <div style={{fontFamily:"Archivo,sans-serif",fontSize:10,letterSpacing:7,fontWeight:900,color:"#C8A96E",textTransform:"uppercase"}}>ON THE ROCKS</div>
            <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(200,169,110,0.4),transparent)",marginTop:12}}/>
          </div>
        ):(
          <div style={{width:76,height:76,borderRadius:18,background:"rgba(200,169,110,0.07)",border:"1px solid rgba(200,169,110,0.18)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,marginTop:8}}>
            <span style={{fontSize:30,color:"#C8A96E",lineHeight:1}}>{cur.icon}</span>
            <span style={{fontSize:8,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(200,169,110,0.65)",fontFamily:"Archivo,sans-serif",fontWeight:700}}>{cur.label}</span>
          </div>
        )}

        {/* texto */}
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isWelcome?22:19,color:"#F0EBE1",lineHeight:1.6,margin:0,fontWeight:400,maxWidth:300}}>{cur.desc}</p>

        {/* botões */}
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",marginTop:4}}>
          <div style={{display:"flex",gap:8,width:"100%"}}>
            {!isWelcome&&(
              <button onClick={()=>goTo(step-1)}
                style={{padding:"14px",borderRadius:4,background:"rgba(240,235,225,0.05)",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.4)",fontSize:13,fontFamily:"Archivo,sans-serif",cursor:"pointer",flexShrink:0}}>
                ←
              </button>
            )}
            <button onClick={()=>isLast?onClose():goTo(step+1)}
              style={{flex:1,padding:"14px",borderRadius:4,background:"rgba(200,169,110,0.12)",border:"1px solid rgba(200,169,110,0.38)",color:"#C8A96E",fontSize:13,letterSpacing:1.5,fontFamily:"Archivo,sans-serif",cursor:"pointer",fontWeight:700,textTransform:"uppercase"}}>
              {isLast?"Começar":"Próximo"}
            </button>
          </div>
          {!isLast&&(
            <button onClick={onClose}
              style={{padding:"10px",borderRadius:4,background:"none",border:"none",color:"rgba(240,235,225,0.22)",fontSize:12,fontFamily:"Archivo,sans-serif",cursor:"pointer"}}>
              Pular tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PERFIL (mobile tab) ──────────────────────────────────────────────────────
function ProfileTab({ allRecipes, drinkCount, tried, favs, owned, customRecipes, exportJSON, importRef, user, syncing, onGoTo, onOpenRecipe, onRestoreAll, onRestoreRecipes, onAddRecipe, onTutorial, availPacks, unlockedPacks, devMode }) {
  const [carouselIdx,setCarouselIdx]=useState(0);
  const [authError,setAuthError]=useState(null);
  const [restoreConfirm,setRestoreConfirm]=useState(null);
  const [versionTaps,setVersionTaps]=useState(0);
  const handleVersionTap=()=>{const n=versionTaps+1;setVersionTaps(n);if(n>=5){setVersionTaps(0);onTutorial();}};
  const [authLoading,setAuthLoading]=useState(false);
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [deleteLoading,setDeleteLoading]=useState(false);
  const handleDeleteAccount=async()=>{
    setDeleteLoading(true);
    try{
      if(user?.uid) await deleteDoc(doc(db,'users',user.uid));
      await deleteUser(user);
    }catch(e){
      setAuthError(e.message||e.code);
      setDeleteConfirm(false);
    }
    setDeleteLoading(false);
  };
  const handleSignIn=async()=>{
    setAuthError(null);setAuthLoading(true);
    try{ await signInWithGoogle(); }
    catch(e){
      // usuário fechou/cancelou o popup: não é erro nem motivo para reabrir
      if(e.code!=="auth/popup-closed-by-user"&&e.code!=="auth/cancelled-popup-request"){
        setAuthError(e.message||e.code);
      }
    }
    setAuthLoading(false);
  };
  const SectionHead=({label})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <div style={{height:1,width:14,background:"#A0785A",opacity:0.85,borderRadius:1}}/>
      <span style={{...CARD_TYPO.sectionHead,opacity:1,color:"rgba(160,120,90,0.95)"}}>{label}</span>
    </div>
  );
  return (
    <div style={{paddingBottom:100}}>

      {/* ── Carrossel de packs à venda ── */}
      {availPacks.length>0&&(
        <div style={{marginBottom:24}}>
          <SectionHead label="Packs disponíveis"/>
          <div style={{position:"relative",overflow:"hidden",borderRadius:14}}>
            {availPacks.map((pack,i)=>(
              <div key={pack.id} style={{display:i===carouselIdx?"block":"none"}}>
                {pack.coverImage?(
                  <img src={pack.coverImage} alt={pack.name} style={{width:"100%",height:180,objectFit:"cover",borderRadius:14,display:"block"}}/>
                ):(
                  <div style={{width:"100%",height:180,borderRadius:14,background:"linear-gradient(135deg,rgba(160,120,90,0.3) 0%,rgba(0,0,0,0.6) 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,border:"1px solid rgba(160,120,90,0.2)"}}>
                    <div style={{fontFamily:"'Gloock',serif",fontSize:22,color:"rgba(231,224,205,0.9)"}}>{pack.name}</div>
                    {pack.price>0&&<div style={{...CARD_TYPO.sectionHead,color:"#A0785A",fontSize:14}}>R$ {Number(pack.price).toFixed(2)}</div>}
                  </div>
                )}
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"28px 16px 12px",background:"linear-gradient(transparent,rgba(0,0,0,0.75))",borderRadius:"0 0 14px 14px",pointerEvents:"none"}}>
                  <div style={{fontFamily:"'Gloock',serif",fontSize:18,color:"rgba(231,224,205,0.97)"}}>{pack.name}</div>
                  {pack.description&&<div style={{fontSize:11,color:"rgba(240,235,225,0.6)",marginTop:2,fontFamily:"Archivo,sans-serif"}}>{pack.description}</div>}
                  {pack.price>0&&<div style={{marginTop:6,...CARD_TYPO.sectionHead,color:"#C8A96E",fontSize:12}}>R$ {Number(pack.price).toFixed(2)} · {(pack.recipeNames||[]).length} receitas</div>}
                </div>
              </div>
            ))}
            {availPacks.length>1&&(
              <>
                <button onClick={()=>setCarouselIdx(i=>(i-1+availPacks.length)%availPacks.length)} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",color:"#fff",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                <button onClick={()=>setCarouselIdx(i=>(i+1)%availPacks.length)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",color:"#fff",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>
                  {availPacks.map((_,i)=>(
                    <div key={i} onClick={()=>setCarouselIdx(i)} style={{width:i===carouselIdx?16:6,height:6,borderRadius:3,background:i===carouselIdx?"#C8A96E":"rgba(255,255,255,0.35)",cursor:"pointer",transition:"width .2s"}}/>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* stats */}
      <div style={{marginBottom:24}}>
        <SectionHead label="Sua coleção"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            ["Receitas",drinkCount,"tudo"],
            ["Provadas",tried.length,"provados"],
            ["Favoritas",favs.length,"favs"],
            ["Minhas receitas",customRecipes.length,"custom"],
          ].map(([l,v,filter])=>(
            <button key={l} onClick={()=>onGoTo(filter)}
              style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(240,235,225,0.13)",borderRadius:12,padding:"18px 16px",textAlign:"left",cursor:"pointer",fontFamily:"Archivo,sans-serif",backdropFilter:"blur(8px)",transition:"border-color .15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(160,120,90,0.35)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(240,235,225,0.13)"}>
              <div style={{fontFamily:"'Gloock',serif",fontSize:34,fontWeight:400,color:"#A0785A",lineHeight:1}}>{v}</div>
              <div style={{...CARD_TYPO.sectionHead,color:"rgba(240,235,225,0.78)",marginTop:6}}>{l}</div>
            </button>
          ))}
        </div>
      </div>

      {/* packs adquiridos */}
      <div style={{marginBottom:24}}>
        <SectionHead label="Packs adquiridos"/>
        <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(240,235,225,0.13)",borderRadius:12,overflow:"hidden",backdropFilter:"blur(8px)"}}>
          {devMode?(
            <div style={{padding:"18px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{width:3,height:"100%",minHeight:36,borderRadius:2,background:"#C8A96E",opacity:0.85,flexShrink:0,alignSelf:"stretch"}}/>
              <div style={{fontFamily:"'Gloock',serif",fontSize:15,color:"rgba(231,224,205,0.88)",lineHeight:1.5}}>
                Obrigado por estar aqui antes das luzes acenderem.<br/>Você possui acesso total liberado.
              </div>
            </div>
          ):unlockedPacks.length>0?(
            availPacks.filter(p=>unlockedPacks.includes(p.id)).map((pack,i,arr)=>(
              <div key={pack.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<arr.length-1?"1px solid rgba(240,235,225,0.05)":"none"}}>
                <div style={{width:3,height:22,borderRadius:2,background:"#C8A96E",opacity:0.85,flexShrink:0}}/>
                <div style={{flex:1,fontFamily:"'Gloock',serif",fontSize:16,fontWeight:400,color:"rgba(231,224,205,0.92)",lineHeight:1.2}}>{pack.name}</div>
                <div style={{...CARD_TYPO.counter,color:"#A0785A",opacity:1}}>{(pack.recipeNames||[]).length} receitas</div>
              </div>
            ))
          ):(
            <div style={{padding:"20px 16px",textAlign:"center",color:"rgba(240,235,225,0.52)",fontSize:13,fontFamily:"Archivo,sans-serif"}}>
              Você ainda não adquiriu nenhum pack.
            </div>
          )}
        </div>
      </div>

      {/* dados */}
      <div style={{marginBottom:24}}>
        <SectionHead label="Dados"/>
        <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(240,235,225,0.13)",borderRadius:12,overflow:"hidden",backdropFilter:"blur(8px)"}}>
          {[
            {label:"+ Nova receita",fn:onAddRecipe,accent:true},
            {label:"↓ Exportar backup",fn:exportJSON},
            {label:"↑ Importar backup",fn:()=>importRef.current?.click()},
          ].map(({label,fn,accent},i,arr)=>(
            <button key={label} onClick={fn}
              style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",width:"100%",background:"none",border:"none",borderBottom:i<arr.length-1?"1px solid rgba(240,235,225,0.05)":"none",color:accent?"#A0785A":"rgba(240,235,225,0.70)",fontSize:13,textAlign:"left",cursor:"pointer",fontFamily:"Archivo,sans-serif",boxSizing:"border-box"}}>
              {label}
            </button>
          ))}
          <div style={{borderTop:"1px solid rgba(240,235,225,0.05)"}}>
            {restoreConfirm==="recipes"?(
              <div style={{padding:"14px 16px"}}>
                <p style={{margin:"0 0 10px",...CARD_TYPO.bodyText,fontSize:12,color:"rgba(240,235,225,0.6)"}}>As receitas originais voltam ao padrão. Suas receitas criadas e avaliações são mantidas.</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{onRestoreRecipes();setRestoreConfirm(null);}} style={{padding:"7px 14px",borderRadius:8,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",color:"#F87171",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>confirmar</button>
                  <button onClick={()=>setRestoreConfirm(null)} style={{padding:"7px 12px",borderRadius:8,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.52)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>cancelar</button>
                </div>
              </div>
            ):(
              <button onClick={()=>setRestoreConfirm("recipes")} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",width:"100%",background:"none",border:"none",borderBottom:"1px solid rgba(240,235,225,0.05)",color:"rgba(239,68,68,0.65)",fontSize:13,textAlign:"left",cursor:"pointer",fontFamily:"Archivo,sans-serif",boxSizing:"border-box"}}>↺ Restaurar receitas originais</button>
            )}
            {restoreConfirm==="all"?(
              <div style={{padding:"14px 16px"}}>
                <p style={{margin:"0 0 10px",...CARD_TYPO.bodyText,fontSize:12,color:"rgba(240,235,225,0.6)"}}>Esta ação vai redefinir toda a experiência — receitas originais voltam ao padrão e as suas receitas criadas serão apagadas. Não dá pra desfazer.</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{onRestoreAll();setRestoreConfirm(null);}} style={{padding:"7px 14px",borderRadius:8,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",color:"#F87171",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>confirmar</button>
                  <button onClick={()=>setRestoreConfirm(null)} style={{padding:"7px 12px",borderRadius:8,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.52)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>cancelar</button>
                </div>
              </div>
            ):(
              <button onClick={()=>setRestoreConfirm("all")} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",width:"100%",background:"none",border:"none",color:"rgba(239,68,68,0.65)",fontSize:13,textAlign:"left",cursor:"pointer",fontFamily:"Archivo,sans-serif",boxSizing:"border-box"}}>⊗ Restaurar app original</button>
            )}
          </div>
        </div>
      </div>

      {/* conta */}
      <div style={{marginBottom:24}}>
        <SectionHead label="Conta"/>
        {user ? (
          <>
            <div style={{position:"relative",padding:"22px 18px",borderRadius:14,background:"rgba(0,0,0,0.35)",border:"1px solid rgba(240,235,225,0.13)",backdropFilter:"blur(10px)",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 80% at 0% 50%,rgba(160,120,90,0.2) 0%,transparent 65%)",pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:14,position:"relative"}}>
                {user.photoURL&&(
                  <div style={{position:"relative",flexShrink:0}}>
                    <div style={{position:"absolute",inset:-3,borderRadius:"50%",background:"radial-gradient(circle,rgba(160,120,90,0.5) 0%,transparent 70%)",filter:"blur(5px)"}}/>
                    <img src={user.photoURL} alt="" style={{width:52,height:52,borderRadius:"50%",border:"1.5px solid rgba(160,120,90,0.45)",position:"relative"}}/>
                  </div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Gloock',serif",fontSize:20,fontWeight:400,color:"rgba(231,224,205,0.97)",lineHeight:1.2,letterSpacing:"-0.2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.displayName}</div>
                  <div style={{fontSize:11,color:"rgba(240,235,225,0.65)",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"Archivo,sans-serif"}}>{user.email}</div>
                  {syncing&&<div style={{...CARD_TYPO.counter,color:"#A0785A",marginTop:5,opacity:1}}>sincronizando…</div>}
                </div>
                <button onClick={signOutUser} style={{...CARD_TYPO.uiLabel,padding:"6px 14px",borderRadius:20,background:"none",border:"1px solid rgba(240,235,225,0.15)",color:"rgba(240,235,225,0.62)",cursor:"pointer",flexShrink:0}}>sair</button>
              </div>
            </div>
            {deleteConfirm?(
              <div style={{marginTop:8,padding:"14px 16px",borderRadius:12,background:"rgba(180,60,60,0.08)",border:"1px solid rgba(180,60,60,0.25)",backdropFilter:"blur(8px)"}}>
                <p style={{margin:"0 0 10px",fontSize:12,color:"rgba(240,235,225,0.6)",fontFamily:"Archivo,sans-serif"}}>Isso apaga permanentemente sua conta e todos os seus dados. Não tem como desfazer.</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={handleDeleteAccount} disabled={deleteLoading} style={{padding:"7px 14px",borderRadius:8,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",color:"#F87171",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>
                    {deleteLoading?"aguarde…":"confirmar exclusão"}
                  </button>
                  <button onClick={()=>setDeleteConfirm(false)} style={{padding:"7px 12px",borderRadius:8,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.52)",fontSize:11,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>cancelar</button>
                </div>
                {authError&&<div style={{marginTop:8,fontSize:11,color:"#e08080",fontFamily:"Archivo,sans-serif"}}>{authError}</div>}
              </div>
            ):(
              <button onClick={()=>setDeleteConfirm(true)} style={{width:"100%",marginTop:8,padding:"10px",borderRadius:10,background:"none",border:"1px solid rgba(180,60,60,0.28)",color:"rgba(239,68,68,0.65)",fontSize:12,textAlign:"center",cursor:"pointer",fontFamily:"Archivo,sans-serif",boxSizing:"border-box"}}>
                deletar conta
              </button>
            )}
          </>
        ) : (
          <div>
            <button onClick={handleSignIn} disabled={authLoading} style={{width:"100%",marginBottom:authError?8:0,padding:"16px",borderRadius:14,background:"rgba(0,0,0,0.35)",border:"1px solid rgba(240,235,225,0.1)",color:"#F0EBE1",fontSize:14,cursor:authLoading?"not-allowed":"pointer",fontFamily:"Archivo,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:12,opacity:authLoading?0.6:1,backdropFilter:"blur(10px)",boxSizing:"border-box"}}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/><path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34A853"/><path d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" fill="#FBBC05"/><path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z" fill="#EA4335"/></svg>
              {authLoading?"Aguarde…":"Entrar com Google"}
            </button>
            {authError&&<div style={{marginTop:8,padding:"10px 12px",borderRadius:8,background:"rgba(180,60,60,0.15)",border:"1px solid rgba(180,60,60,0.3)",fontSize:11,color:"#e08080",fontFamily:"Archivo,sans-serif",wordBreak:"break-all"}}>{authError}</div>}
          </div>
        )}
      </div>

      {/* sobre */}
      <div style={{marginBottom:16}}>
        <SectionHead label="Sobre"/>
        <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(240,235,225,0.13)",borderRadius:12,padding:"18px 18px",backdropFilter:"blur(8px)",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontFamily:"Archivo,sans-serif",fontSize:12,fontWeight:900,letterSpacing:4,textTransform:"uppercase",color:"rgba(231,224,205,0.85)"}}>ON THE ROCKS</span>
            <span onClick={handleVersionTap} style={{...CARD_TYPO.counter,cursor:"default",userSelect:"none",opacity:0.4}}>v1.0</span>
          </div>
          <div style={{height:"1px",background:"linear-gradient(to right,rgba(160,120,90,0.5),transparent)"}}/>
          <p style={{fontSize:12,color:"rgba(240,235,225,0.58)",fontFamily:"Archivo,sans-serif",margin:0}}>Desenvolvido por Marcelo Parducci</p>
          <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
            <span style={{fontSize:10,color:"rgba(240,235,225,0.62)",fontFamily:"Archivo,sans-serif",letterSpacing:.5}}>Dados</span>
            <span style={{fontSize:10,color:"rgba(240,235,225,0.58)",fontFamily:"Archivo,sans-serif",textAlign:"right"}}>Sincronizados via Google Account</span>
          </div>
        </div>
      </div>

      <div style={{paddingTop:16,borderTop:"1px solid rgba(240,235,225,0.16)",textAlign:"center",fontSize:10,color:"rgba(240,235,225,0.62)",fontFamily:"Archivo,sans-serif",lineHeight:1.8}}>
        Conteúdo destinado a maiores de 18 anos.<br/>Beba com responsabilidade.
      </div>

      <div style={{marginTop:14,textAlign:"center",...CARD_TYPO.counter,color:"rgba(240,235,225,0.15)",letterSpacing:1}}>
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
// ─── PERFIS DAS RECEITAS BASE (dados estáticos — fora do componente) ─────────
const RECIPE_PROFILES = {
  "Aperol Spritz":{"flavors":"Amargo • Cítrico • Floral","perfil":"Refrescante","perfil_desc":"Leve e espumante","sensacao":"Efervescente","sensacao_desc":"Bolhas frescas","ocasiao":"Início de noite","ocasiao_desc":"Início de celebração"},
  "Aviation":{"flavors":"floral • cítrico • amargado","perfil":"Delicado","perfil_desc":"elegância aromática leve","sensacao":"Refrescante","sensacao_desc":"toque fresco e seco","ocasiao":"Noite","ocasiao_desc":"coquetel sofisticado clássico"},
  "Beirão & Maracujá":{"flavors":"Frutado • Cítrico • Herbáceo","perfil":"Refrescante","perfil_desc":"Leve e descontraído","sensacao":"Efervescente","sensacao_desc":"Bolhas vibrantes","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Beirão + Campari":{"flavors":"Amargo • Herbal • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegância amarga e complexa","sensacao":"Refrescante","sensacao_desc":"Fresco e estimulante","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Beirão Lemon":{"flavors":"Cítrico • Herbal • Refrescante","perfil":"Equilibrado","perfil_desc":"Doce e ácido harmonioso","sensacao":"Efervescente","sensacao_desc":"Leve e vivificante","ocasiao":"Social","ocasiao_desc":"Tarde ou aperitivo"},
  "Beirão Spritz":{"flavors":"Cítrico • Herbal • Efervescente","perfil":"Refrescante","perfil_desc":"Leve e vivaz","sensacao":"Espumante","sensacao_desc":"Burbujas dançantes","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Beirão, Mel & Alecrim":{"flavors":"Herbáceo • Melado • Cítrico","perfil":"Aromático","perfil_desc":"floral e resinoso","sensacao":"Reconfortante","sensacao_desc":"morna e envolvente","ocasiao":"Apéritivo","ocasiao_desc":"tardes contemplativas"},
  "Bourbon, laranja e gengibre":{"flavors":"Quente • Cítrico • Doce","perfil":"Aromático","perfil_desc":"Especiado e refrescante","sensacao":"Revigorante","sensacao_desc":"Picante e energizante","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Bramble":{"flavors":"Frutado • Cítrico • Herbal","perfil":"Sofisticado","perfil_desc":"elegância frutal equilibrada","sensacao":"Refrescante","sensacao_desc":"fresco e envolvente","ocasiao":"Noturna","ocasiao_desc":"momentos contemplativo"},
  "Cantaloupe Martini sem álcool":{"flavors":"Frutado • Herbáceo • Refrescante","perfil":"Sofisticado","perfil_desc":"elegância sem álcool","sensacao":"Leveza","sensacao_desc":"toque cremoso e leve","ocasiao":"Verão","ocasiao_desc":"tarde ensolarada"},
  "Citrus Martini":{"flavors":"Cítrico • Doce • Aperitivo","perfil":"Refrescante","perfil_desc":"Leve e vibrante","sensacao":"Efervescente","sensacao_desc":"Picante na língua","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Coco e tônica":{"flavors":"Tropical • Cítrico • Refrescante","perfil":"Leve","perfil_desc":"Suave e equilibrado","sensacao":"Efervescente","sensacao_desc":"Burbujanante na boca","ocasiao":"Praia","ocasiao_desc":"Dias quentes e ensolarados"},
  "Cynar Ginger Spritz":{"flavors":"Amargo • Refrescante • Especiado","perfil":"Sofisticado","perfil_desc":"elegância amarga e borbulhante","sensacao":"Vivificante","sensacao_desc":"picância ginger na garganta","ocasiao":"Início de noite","ocasiao_desc":"pré-jantar estimulante"},
  "Daiquiri Parisiense":{"flavors":"Floral • Cítrico • Suave","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Refrescante","sensacao_desc":"Leve e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Momento chique e descontraído"},
  "Dark 'n' Stormy":{"flavors":"Picante • Amadeirado • Cítrico","perfil":"Robusto","perfil_desc":"intenso e envolvente","sensacao":"Ardente","sensacao_desc":"queimação refrescante","ocasiao":"Noturna","ocasiao_desc":"clima tempestuoso"},
  "Garden Gin":{"flavors":"Herbal • Cítrico • Refrescante","perfil":"Botânico","perfil_desc":"Jardim em copo","sensacao":"Revigorante","sensacao_desc":"Frescor penetrante","ocasiao":"Verão","ocasiao_desc":"Tardes luminosas"},
  "Dry Martini":{"flavors":"Seco • Herbáceo • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância cristalina","sensacao":"Refrescante","sensacao_desc":"frieza penetrante","ocasiao":"Início de noite","ocasiao_desc":"encontro intelectual"},
  "Elderflower Aviation":{"flavors":"Floral • Cítrico • Amargo","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Fresco","sensacao_desc":"Leve e efervescente","ocasiao":"Coquetel","ocasiao_desc":"Aperitivo sofisticado"},
  "Elderflower Daiquiri":{"flavors":"Floral • Cítrico • Delicado","perfil":"Elegante","perfil_desc":"sofisticado e refinado","sensacao":"Refrescante","sensacao_desc":"leve e efervescente","ocasiao":"Primavera","ocasiao_desc":"jardim ao entardecer"},
  "Fermentação selvagem (Ginger Bug)":{"flavors":"Picante • Cítrico • Fermentado","perfil":"Revigorante","perfil_desc":"Efervescente e energizante","sensacao":"Formigante","sensacao_desc":"Burbujas na língua","ocasiao":"Início de noite","ocasiao_desc":"Antes de refeições"},
  "Flor de Cerejeira Fizz":{"flavors":"Floral • Doce • Cítrico","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Efervescente","sensacao_desc":"Leve e refrescante","ocasiao":"Início de noite","ocasiao_desc":"Momento especial e celebração"},
  "Flor de Cerejeira Spritz":{"flavors":"Floral • Herbal • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegância primaveril","sensacao":"Refrescante","sensacao_desc":"Leve e espumante","ocasiao":"Celebração","ocasiao_desc":"Momentos especiais"},
  "French 75":{"flavors":"Cítrico • Floral • Efervescente","perfil":"Sofisticado","perfil_desc":"Elegante e refinado","sensacao":"Brilhante","sensacao_desc":"Leve e vivaz","ocasiao":"Celebração","ocasiao_desc":"Momentos especiais"},
  "Garden Spritz":{"flavors":"Floral • Frutado • Herbáceo","perfil":"Refinado","perfil_desc":"Elegante e leve","sensacao":"Efervescente","sensacao_desc":"Fresco e borbulhante","ocasiao":"Início de noite","ocasiao_desc":"Momento primaveril sofisticado"},
  "Gin Fizz":{"flavors":"Cítrico • Botânico • Refrescante","perfil":"Clássico","perfil_desc":"Elegância fizz londrino","sensacao":"Efervescente","sensacao_desc":"Borbulhas dançantes","ocasiao":"Início de noite","ocasiao_desc":"Tarde social ensolarada"},
  "Gin Tônica":{"flavors":"Cítrico • Botânico • Refrescante","perfil":"Clássico","perfil_desc":"elegância pura e simples","sensacao":"Efervescente","sensacao_desc":"burbujas vibrantes e leves","ocasiao":"Social","ocasiao_desc":"encontros descontraídos"},
  "Gin Tônica de Bergamota":{"flavors":"Cítrico • Botânico • Refrescante","perfil":"Elegante","perfil_desc":"sofisticado e equilibrado","sensacao":"Leve","sensacao_desc":"fresco e vivificante","ocasiao":"Social","ocasiao_desc":"encontros descontraídos"},
  "Ginger beer (caseira)":{"flavors":"Picante • Cítrico • Fermentado","perfil":"Refrescante","perfil_desc":"bebida viva e estimulante","sensacao":"Formigante","sensacao_desc":"gengibre queimando na garganta","ocasiao":"Casual","ocasiao_desc":"encontros descontraídos"},
  "Grenadine Ginger Margarita":{"flavors":"Picante • Cítrico • Doce","perfil":"Vibrante","perfil_desc":"Energético e refrescante","sensacao":"Efervescente","sensacao_desc":"Burbujas picantes na língua","ocasiao":"Festas","ocasiao_desc":"Celebração tropical animada"},
  "Hemingway Daiquiri Cordial":{"flavors":"Cítrico • Amargo • Floral","perfil":"Elegante","perfil_desc":"refinado e sofisticado","sensacao":"Refrescante","sensacao_desc":"fresco e revigorante","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar"},
  "Hemingway Daiquiri":{"flavors":"Cítrico • Alcoólico • Amargo","perfil":"Sofisticado","perfil_desc":"elegância tropical clássica","sensacao":"Refrescante","sensacao_desc":"fresco e revigorante","ocasiao":"Início de noite","ocasiao_desc":"momento de sofisticação"},
  "Highball de Luxardo":{"flavors":"Amargo • Cítrico • Herbal","perfil":"Sofisticado","perfil_desc":"Elegante e refinado","sensacao":"Refrescante","sensacao_desc":"Leve e revigorante","ocasiao":"Início de noite","ocasiao_desc":"Momento social e descontraído"},
  "Hurricane":{"flavors":"Tropical • Frutado • Encorpado","perfil":"Exuberante","perfil_desc":"Explosão tropical intensa","sensacao":"Envolvente","sensacao_desc":"Calor suave e sedoso","ocasiao":"Festa","ocasiao_desc":"Celebração descontraída"},
  "Jamaica Rouge":{"flavors":"Encorpado • Frutado • Amargado","perfil":"Clássico","perfil_desc":"tropical e sofisticado","sensacao":"Aquecimento","sensacao_desc":"morno e envolvente","ocasiao":"Noite","ocasiao_desc":"momento contemplativo"},
  "Jasmine (Casa do Porco)":{"flavors":"Floral • Amargo • Cítrico","perfil":"Equilibrado","perfil_desc":"Harmonioso e refinado","sensacao":"Refrescante","sensacao_desc":"Leve e vibrante","ocasiao":"Início de noite","ocasiao_desc":"Início da noite"},
  "Jus dinger":{"flavors":"Picante • Tropical • Refrescante","perfil":"Revigorante","perfil_desc":"Tropical com mordida","sensacao":"Energizante","sensacao_desc":"Formigamento agradável","ocasiao":"Verão","ocasiao_desc":"Dias quentes intensos"},
  "Lavender Gin Sour":{"flavors":"Floral • Cítrico • Cremoso","perfil":"Sofisticado","perfil_desc":"elegância aromática delicada","sensacao":"Aveludado","sensacao_desc":"textura morna envolvente","ocasiao":"Noite","ocasiao_desc":"momento especial refinado"},
  "Licor Beirão Sour":{"flavors":"Herbáceo • Cítrico • Cremoso","perfil":"Sofisticado","perfil_desc":"Elegância equilibrada","sensacao":"Aveludado","sensacao_desc":"Macio e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Momento refinado"},
  "Manhattan":{"flavors":"Amadeirado • Encorpado • Sofisticado","perfil":"Clássico","perfil_desc":"tradição em copo","sensacao":"Quente","sensacao_desc":"abraço alcoólico","ocasiao":"Noturna","ocasiao_desc":"encontros elegantes"},
  "Manhattan (Perfect)":{"flavors":"Encorpado • Equilibrado • Sofisticado","perfil":"Clássico","perfil_desc":"Elegância atemporal","sensacao":"Suave","sensacao_desc":"Mornidão envolvente","ocasiao":"Sofisticação","ocasiao_desc":"Noite de charme"},
  "Highball de Luxardo com Whisky":{"flavors":"Amadeirado • Floral • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância refinada","sensacao":"Refrescante","sensacao_desc":"efervescência suave","ocasiao":"Início de noite","ocasiao_desc":"momento de requinte"},
  "Improved Whiskey Cocktail":{"flavors":"Amadeirado • Cereja • Cítrico","perfil":"Clássico","perfil_desc":"Elegante e sofisticado","sensacao":"Aquecente","sensacao_desc":"Suave e envolvente","ocasiao":"Noturna","ocasiao_desc":"Para reflexão contemplativa"},
  "Maraschino Spritz":{"flavors":"Cereja • Floral • Cítrico","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Efervescente","sensacao_desc":"Leve e refrescante","ocasiao":"Início de noite","ocasiao_desc":"Momentos sofisticados e celebratórios"},
  "Margarita":{"flavors":"Cítrico • Agave • Refrescante","perfil":"Clássico","perfil_desc":"equilibrado e versátil","sensacao":"Vibrante","sensacao_desc":"fresco e estimulante","ocasiao":"Social","ocasiao_desc":"celebração descontraída"},
  "Martinez":{"flavors":"Herbáceo • Amargo • Frutado","perfil":"Clássico","perfil_desc":"Sofisticado e equilibrado","sensacao":"Elegante","sensacao_desc":"Seco e encorpado","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Mojito":{"flavors":"Refrescante • Cítrico • Herbáceo","perfil":"Tropical","perfil_desc":"Leve e vivificante","sensacao":"Vibrante","sensacao_desc":"Frescor na boca","ocasiao":"Verão","ocasiao_desc":"Dias quentes e ensolarados"},
  "Mojito Amendoado":{"flavors":"Frutado • Herbal • Especiado","perfil":"Sofisticado","perfil_desc":"Tropical com toque amêndoa","sensacao":"Refrescante","sensacao_desc":"Menta e gengibre vivificante","ocasiao":"Início de noite","ocasiao_desc":"Pré-jantar tropical"},
  "Mojito de framboesa":{"flavors":"Frutado • Refrescante • Herbal","perfil":"Tropical","perfil_desc":"Framboesa doce e mentol","sensacao":"Vivificante","sensacao_desc":"Formigante e leve","ocasiao":"Verão","ocasiao_desc":"Tardezinha festiva"},
  "Moscow Mule":{"flavors":"Cítrico • Picante • Refrescante","perfil":"Vibrante","perfil_desc":"Energético e descontraído","sensacao":"Formigante","sensacao_desc":"Gengibre na boca","ocasiao":"Social","ocasiao_desc":"Encontros informais"},
  "Mr. Grinch":{"flavors":"Picante • Refrescante • Terroso","perfil":"Provocador","perfil_desc":"Desafiador e assertivo","sensacao":"Ardente","sensacao_desc":"Queimação agradável","ocasiao":"Festas","ocasiao_desc":"Celebração descontraída"},
  "Negroni":{"flavors":"Amargo • Herbal • Encorpado","perfil":"Clássico","perfil_desc":"Sofisticado e equilibrado","sensacao":"Seco","sensacao_desc":"Tânico e refrescante","ocasiao":"Início de noite","ocasiao_desc":"Noite elegante e social"},
  "Negroni Sbagliato":{"flavors":"Amargo • Floral • Afrutado","perfil":"Elegante","perfil_desc":"Sofisticado e leve","sensacao":"Efervescente","sensacao_desc":"Borbulhante e refrescante","ocasiao":"Início de noite","ocasiao_desc":"Momento social descontraído"},
  "Old Fashioned":{"flavors":"Amadeirado • Amargo • Cítrico","perfil":"Clássico","perfil_desc":"Elegante e atemporal","sensacao":"Aquecente","sensacao_desc":"Suave e envolvente","ocasiao":"Sofisticado","ocasiao_desc":"Noites contemplativas"},
  "Pisco Elderflower Sour":{"flavors":"Floral • Cítrico • Suave","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Aveludada","sensacao_desc":"Morna e cremosa","ocasiao":"Coquetel","ocasiao_desc":"Aperitivo sofisticado"},
  "Pisco Sour":{"flavors":"Cítrico • Suave • Encorpado","perfil":"Elegante","perfil_desc":"Sofisticado e equilibrado","sensacao":"Aveludada","sensacao_desc":"Macia na boca","ocasiao":"Início de noite","ocasiao_desc":"Início refinado"},
  "Andes Highball":{"flavors":"Anisado • Cítrico • Refrescante","perfil":"Aromático","perfil_desc":"Erva-doce dominante","sensacao":"Efervescente","sensacao_desc":"Leve e vibrante","ocasiao":"Social","ocasiao_desc":"Tarde ensolarada"},
  "Uva & Sal":{"flavors":"Frutado • Mineral • Terroso","perfil":"Sofisticado","perfil_desc":"Elegância líquida refinada","sensacao":"Refrescante","sensacao_desc":"Frescor mineral vibrante","ocasiao":"Início de noite","ocasiao_desc":"Momento de elegância descontraída"},
  "Flor de Pedra":{"flavors":"Floral • Delicado • Melado","perfil":"Sofisticado","perfil_desc":"Elegância aromática e refinada","sensacao":"Sedoso","sensacao_desc":"Macio e envolvente","ocasiao":"Crepúsculo","ocasiao_desc":"Momento contemplativo e romântico"},
  "Campo Seco":{"flavors":"Amargo • Herbal • Complexo","perfil":"Sofisticado","perfil_desc":"Elegância mineral e aromática","sensacao":"Envolvente","sensacao_desc":"Aquecimento prolongado","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Pisco & Coco Tostado":{"flavors":"Tropical • Cremoso • Tostado","perfil":"Exótico","perfil_desc":"Elegância tropical e quente","sensacao":"Aveludado","sensacao_desc":"Suavidade envolvente","ocasiao":"Crepúsculo","ocasiao_desc":"Momentos de contemplação"},
  "Verde Urbano":{"flavors":"Cítrico • Herbáceo • Refrescante","perfil":"Sofisticado","perfil_desc":"elegância urbana e modernidade","sensacao":"Energizante","sensacao_desc":"espuma refrescante na língua","ocasiao":"Início de noite","ocasiao_desc":"encontros noturnos descontraídos"},
  "Noite em Lima":{"flavors":"Encorpado • Amargo • Chocolatudo","perfil":"Sofisticado","perfil_desc":"Elegância peruana noturna","sensacao":"Envolvente","sensacao_desc":"Calor sedoso e profundo","ocasiao":"Pós-jantar","ocasiao_desc":"Momento contemplativo e luxuoso"},
  "Pisco com Cerveja Branca":{"flavors":"Cítrico • Cremoso • Refrescante","perfil":"Híbrido","perfil_desc":"Espírito e fermentado","sensacao":"Efervescente","sensacao_desc":"Leve e gasoso","ocasiao":"Social","ocasiao_desc":"Tarde descontraída"},
  "Seco de Maçã":{"flavors":"Cítrico • Frutado • Seco","perfil":"Refrescante","perfil_desc":"Leve e vivaz","sensacao":"Crispante","sensacao_desc":"Picância agradável","ocasiao":"Início de noite","ocasiao_desc":"Antes do almoço"},
  "Pisco Terroso":{"flavors":"Terroso • Picante • Doce","perfil":"Aromático","perfil_desc":"Especiado e reconfortante","sensacao":"Aquecente","sensacao_desc":"Gengibre queimando levemente","ocasiao":"Noite","ocasiao_desc":"Digestivo contemplativo"},
  "Sazerac":{"flavors":"Herbal • Spiced • Warming","perfil":"Clássico","perfil_desc":"Elegância aperitiva refinada","sensacao":"Intenso","sensacao_desc":"Queimação anisada sedutora","ocasiao":"Noturna","ocasiao_desc":"Coquetel contemplativo sofisticado"},
  "SAZERAC por Kennedy Nascimento":{"flavors":"Especiado • Amadeirado • Herbal","perfil":"Clássico","perfil_desc":"Sofisticado e equilibrado","sensacao":"Envolvente","sensacao_desc":"Quente e reconfortante","ocasiao":"Noturna","ocasiao_desc":"Contemplação refinada"},
  "Sevilla Sour":{"flavors":"Floral • Cítrico • Herbal","perfil":"Elegante","perfil_desc":"sofisticado e luminoso","sensacao":"Fresco","sensacao_desc":"refrescante e aveludado","ocasiao":"Início de noite","ocasiao_desc":"encontros ao entardecer"},
  "Shanksjillo":{"flavors":"Amargo • Adocicado • Encorpado","perfil":"Sofisticado","perfil_desc":"Elegância escura e refinada","sensacao":"Intenso","sensacao_desc":"Queimado e suave","ocasiao":"Pós-jantar","ocasiao_desc":"Finalização premium"},
  "Smoked Apple Whiskey Tonic":{"flavors":"Defumado • Especiado • Frutado","perfil":"Sofisticado","perfil_desc":"Whiskey aromático e complexo","sensacao":"Aquecente","sensacao_desc":"Calor suave e envolvente","ocasiao":"Noturna","ocasiao_desc":"Momentos intimistas e reflexivos"},
  "Smokey Martini":{"flavors":"Defumado • Botânico • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância fumarada","sensacao":"Envolvente","sensacao_desc":"calor defumado","ocasiao":"Noturna","ocasiao_desc":"encontros refinados"},
  "Spring Martini":{"flavors":"Floral • Cítrico • Herbal","perfil":"Sofisticado","perfil_desc":"Elegância primaveril leve","sensacao":"Refrescante","sensacao_desc":"Fresco e delicado","ocasiao":"Início de noite","ocasiao_desc":"Momento elegante e descontraído"},
  "St‑Germain Hugo Spritz":{"flavors":"Floral • Cítrico • Refrescante","perfil":"Elegante","perfil_desc":"Sofisticado e leve","sensacao":"Espumante","sensacao_desc":"Bolhas refrescantes","ocasiao":"Início de noite","ocasiao_desc":"Momento social leve"},
  "St‑Germain Spritz":{"flavors":"Floral • Cítrico • Delicado","perfil":"Refrescante","perfil_desc":"leve e elegante","sensacao":"Efervescente","sensacao_desc":"borbulhante e sofisticada","ocasiao":"Início de noite","ocasiao_desc":"encontros vespertinos"},
  "The Clover Club":{"flavors":"Floral • Cítrico • Frutado","perfil":"Elegante","perfil_desc":"Sofisticado e delicado","sensacao":"Espumoso","sensacao_desc":"Aéreo e cremoso","ocasiao":"Coquetel","ocasiao_desc":"Festas e celebrações"},
  "Tom Gatsby":{"flavors":"Herbáceo • Cítrico • Amargo","perfil":"Sofisticado","perfil_desc":"Elegante e refinado","sensacao":"Refrescante","sensacao_desc":"Leve e estimulante","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Whiskey Mule de Romã":{"flavors":"Amadeirado • Frutado • Especiado","perfil":"Sofisticado","perfil_desc":"Elegância com aridez","sensacao":"Refrescante","sensacao_desc":"Picância suave prolongada","ocasiao":"Noite","ocasiao_desc":"Momento requintado"},
  "Whiskey Sour":{"flavors":"Cítrico • Amadeirado • Herbal","perfil":"Clássico","perfil_desc":"elegante e equilibrado","sensacao":"Aveludado","sensacao_desc":"sedoso e refrescante","ocasiao":"Coquetel","ocasiao_desc":"noite sofisticada"},
  "White Russian de abóbora":{"flavors":"Cremoso • Doce • Especiado","perfil":"Confortável","perfil_desc":"Abraço líquido quente","sensacao":"Aveludada","sensacao_desc":"Macio na boca","ocasiao":"Outono","ocasiao_desc":"Noites aconchegantes"},
  "Daiquiri":{"flavors":"Cítrico • Doce • Refrescante","perfil":"Clássico","perfil_desc":"Elegância atemporal","sensacao":"Leve","sensacao_desc":"Suave e fluido","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Cosmopolitan":{"flavors":"Cítrico • Frutado • Sofisticado","perfil":"Elegante","perfil_desc":"Refrescante e envolvente","sensacao":"Vibrante","sensacao_desc":"Tangy e equilibrado","ocasiao":"Coquetel","ocasiao_desc":"Noites especiais e celebrações"},
  "Gimlet":{"flavors":"Cítrico • Refrescante • Herbáceo","perfil":"Clássico","perfil_desc":"elegância destilada","sensacao":"Revigorante","sensacao_desc":"acidez limpa e pura","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar"},
  "Americano":{"flavors":"Amargo • Doce • Cítrico","perfil":"Clássico","perfil_desc":"Sofisticado e equilibrado","sensacao":"Refrescante","sensacao_desc":"Espumante e vibrante","ocasiao":"Início de noite","ocasiao_desc":"Início de noite"},
  "Boulevardier":{"flavors":"Amargo • Encorpado • Sofisticado","perfil":"Clássico","perfil_desc":"Elegância atemporal e refinada","sensacao":"Aquecente","sensacao_desc":"Calidez reconfortante e envolvente","ocasiao":"Noite","ocasiao_desc":"Momentos contemplativoss e elegantes"},
  "Rob Roy":{"flavors":"Amadeirado • Doce • Especiado","perfil":"Clássico","perfil_desc":"Sofisticado e refinado","sensacao":"Aquecente","sensacao_desc":"Envolvente e reconfortante","ocasiao":"Noturna","ocasiao_desc":"Momentos elegantes e introspectivos"},
  "Vieux Carré":{"flavors":"Encorpado • Herbal • Especiado","perfil":"Clássico","perfil_desc":"Sofisticação alcoólica francesa","sensacao":"Quente","sensacao_desc":"Abraço reconfortante","ocasiao":"Noite","ocasiao_desc":"Reflexão contemplativa"},
  "Amaretto Sour":{"flavors":"Amendoado • Cítrico • Sedoso","perfil":"Equilibrado","perfil_desc":"doçura com acidez","sensacao":"Aveludado","sensacao_desc":"espuma cremosa","ocasiao":"Início de noite","ocasiao_desc":"encontro descontraído"},
  "New York Sour":{"flavors":"Cítrico • Encorpado • Frutado","perfil":"Sofisticado","perfil_desc":"Elegância amadurecida","sensacao":"Aveludado","sensacao_desc":"Macio e envolvente","ocasiao":"Noturna","ocasiao_desc":"Coquetel de celebração"},
  "Espresso Martini":{"flavors":"Intenso • Amargo • Cremoso","perfil":"Sofisticado","perfil_desc":"elegância e poder","sensacao":"Energizante","sensacao_desc":"desperta e estimula","ocasiao":"Noturno","ocasiao_desc":"antes de festas"},
  "Sidecar":{"flavors":"Cítrico • Sofisticado • Luminoso","perfil":"Elegante","perfil_desc":"Refinado e equilibrado","sensacao":"Fresco","sensacao_desc":"Efervescente na língua","ocasiao":"Início de noite","ocasiao_desc":"Noites sofisticadas"},
  "Bee's Knees":{"flavors":"Cítrico • Floral • Adocicado","perfil":"Clássico","perfil_desc":"elegância atemporal e sofisticação","sensacao":"Refrescante","sensacao_desc":"leveza equilibrada e brilhante","ocasiao":"Início de noite","ocasiao_desc":"encontros sofisticados e celebrações"},
  "Last Word":{"flavors":"Herbal • Floral • Cítrico","perfil":"Equilibrado","perfil_desc":"Proporções perfeitas e harmônicas","sensacao":"Refrescante","sensacao_desc":"Vivacidade com amargor elegante","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar sofisticado"},
  "Penicillin":{"flavors":"Picante • Cítrico • Defumado","perfil":"Robusto","perfil_desc":"Complexo e aquecedor","sensacao":"Revigorante","sensacao_desc":"Gengibre ardente","ocasiao":"Noite","ocasiao_desc":"Repouso meditativo"},
  "Gold Rush":{"flavors":"Quente • Doce • Cítrico","perfil":"Clássico","perfil_desc":"elegância atemporal","sensacao":"Reconfortante","sensacao_desc":"calor envolvente","ocasiao":"Noite","ocasiao_desc":"momentos contemplativs"},
  "Cuba Libre":{"flavors":"Doce • Cítrico • Refrescante","perfil":"Clássico","perfil_desc":"Tradicional e descomplicado","sensacao":"Refrescante","sensacao_desc":"Gelado e estimulante","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Paper Plane":{"flavors":"Amargo • Cítrico • Herbáceo","perfil":"Sofisticado","perfil_desc":"Elegância equilibrada e refinada","sensacao":"Refrescante","sensacao_desc":"Leve friozinho na boca","ocasiao":"Início de noite","ocasiao_desc":"Início de noite sofisticado"},
  "Singapore Sling":{"flavors":"Tropical • Frutado • Floral","perfil":"Exótico","perfil_desc":"Frutas tropicais perfumadas","sensacao":"Refrescante","sensacao_desc":"Leve e vivificante","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Mimosa":{"flavors":"Cítrico • Floral • Refrescante","perfil":"Elegante","perfil_desc":"sofisticação leve e radiante","sensacao":"Efervescente","sensacao_desc":"burbujas dançantes na língua","ocasiao":"Brunch","ocasiao_desc":"manhã celebrativa e luminosa"},
  "Bellini":{"flavors":"Frutado • Delicado • Refrescante","perfil":"Elegante","perfil_desc":"sofisticação leve e acessível","sensacao":"Efervescente","sensacao_desc":"bolhas suaves na língua","ocasiao":"Brunch","ocasiao_desc":"repouso matinal requintado"},
  "Rossini":{"flavors":"Frutado • Refrescante • Elegante","perfil":"Feminino","perfil_desc":"Sofisticado e delicado","sensacao":"Efervescente","sensacao_desc":"Fresco na boca","ocasiao":"Brunch","ocasiao_desc":"Momento elegante diurno"},
  "Tintoretto":{"flavors":"Frutado • Efervescente • Sofisticado","perfil":"Elegante","perfil_desc":"Refrescante e luxuoso","sensacao":"Vibrante","sensacao_desc":"Hormiguante na língua","ocasiao":"Social","ocasiao_desc":"Celebração chic"},
  "Puccini":{"flavors":"Cítrico • Espumante • Fresco","perfil":"Elegante","perfil_desc":"Sofisticado e leve","sensacao":"Efervescente","sensacao_desc":"Bolhas delicadas","ocasiao":"Início de noite","ocasiao_desc":"Momentos refinados"},
  "Kir Royale":{"flavors":"Frutado • Elegante • Refrescante","perfil":"Sofisticado","perfil_desc":"Requintado e leve","sensacao":"Efervescente","sensacao_desc":"Borbulhante e sedoso","ocasiao":"Celebração","ocasiao_desc":"Momentos especiais e festivos"},
  "Tommy's Margarita":{"flavors":"Cítrico • Herbáceo • Doce","perfil":"Fresco","perfil_desc":"Limão vivo e puro","sensacao":"Refrescante","sensacao_desc":"Toque suave e envolvente","ocasiao":"Casual","ocasiao_desc":"Encontros descontraídos"},
  "Caipiroska":{"flavors":"Cítrico • Doce • Refrescante","perfil":"Vibrante","perfil_desc":"Energético e descontraído","sensacao":"Gelado","sensacao_desc":"Fresco na boca","ocasiao":"Social","ocasiao_desc":"Encontros informais"},
  "White Russian":{"flavors":"Cremoso • Doce • Suave","perfil":"Indulgente","perfil_desc":"Sedoso e reconfortante","sensacao":"Morna","sensacao_desc":"Acetinado na boca","ocasiao":"Noturna","ocasiao_desc":"Após jantar elegante"},
  "Frozen Daiquiri":{"flavors":"Refrescante • Cítrico • Suave","perfil":"Tropical","perfil_desc":"Doce e gelado","sensacao":"Gelada","sensacao_desc":"Fria e cremosa","ocasiao":"Praia","ocasiao_desc":"Dias quentes e ensolarados"},
  "Frozen Margarita":{"flavors":"Cítrico • Refrescante • Adocicado","perfil":"Tropical","perfil_desc":"Exótico e gelado","sensacao":"Gelada","sensacao_desc":"Frio intenso","ocasiao":"Verão","ocasiao_desc":"Dias quentes"},
  "Mezcal Negroni":{"flavors":"Defumado • Amargo • Adocicado","perfil":"Sofisticado","perfil_desc":"Complexo e terroso","sensacao":"Intenso","sensacao_desc":"Queimado e sedoso","ocasiao":"Início de noite","ocasiao_desc":"Noites refinadas"},
  "Oaxacan Old Fashioned":{"flavors":"Defumado • Especiado • Amargo","perfil":"Complexo","perfil_desc":"Encorpado e sofisticado","sensacao":"Aquecente","sensacao_desc":"Queimada prolongada","ocasiao":"Noturna","ocasiao_desc":"Reflexão contemplativa"},
  "Paloma Cordial":{"flavors":"Cítrico • Amargo • Picante","perfil":"Refrescante","perfil_desc":"tropical e vibrante","sensacao":"Estimulante","sensacao_desc":"queimação picante","ocasiao":"Tarde","ocasiao_desc":"drinks descontraídos"},
  "Paloma":{"flavors":"Cítrico • Refrescante • Salgado","perfil":"Vibrante","perfil_desc":"Alegre e descontraído","sensacao":"Refrescante","sensacao_desc":"Leve e estimulante","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Tequila Sunrise":{"flavors":"Cítrico • Doce • Tropical","perfil":"Radiante","perfil_desc":"Brilho solar líquido","sensacao":"Refrescante","sensacao_desc":"Frieza vibrante e leve","ocasiao":"Tarde","ocasiao_desc":"Momento de celebração"},
  "Piña Colada":{"flavors":"Tropical • Cremoso • Frutado","perfil":"Exótico","perfil_desc":"Praia e férias","sensacao":"Refrescante","sensacao_desc":"Suave e gelado","ocasiao":"Verão","ocasiao_desc":"Dias quentes e relaxados"},
  "Mai Tai":{"flavors":"Tropical • Amadeirado • Cítrico","perfil":"Exótico","perfil_desc":"Sofisticado e equilibrado","sensacao":"Refrescante","sensacao_desc":"Suave e envolvente","ocasiao":"Noite","ocasiao_desc":"Encontros elegantes"},
  "Jungle Bird":{"flavors":"Tropical • Amargo • Suculento","perfil":"Exótico","perfil_desc":"Selva em copo","sensacao":"Refrescante","sensacao_desc":"Picante e tropical","ocasiao":"Festa","ocasiao_desc":"Celebração descontraída"},
  "Irish Coffee":{"flavors":"Encorpado • Caramelado • Cremoso","perfil":"Reconfortante","perfil_desc":"quente e envolvente","sensacao":"Suave","sensacao_desc":"morno e aveludado","ocasiao":"Noite","ocasiao_desc":"repouso contemplativo"},
  "Hot Toddy":{"flavors":"Quente • Mel • Especiado","perfil":"Reconfortante","perfil_desc":"Abraço líquido aromático","sensacao":"Envolvente","sensacao_desc":"Calor reconfortante profundo","ocasiao":"Inverno","ocasiao_desc":"Noites frias aconchegantes"},
  "Black Russian":{"flavors":"Achocolatado • Amargo • Suave","perfil":"Clássico","perfil_desc":"elegância atemporal","sensacao":"Sedoso","sensacao_desc":"macio e envolvente","ocasiao":"Noturna","ocasiao_desc":"pós-jantar relaxante"},
  "Godfather":{"flavors":"Amêndoa • Fumaça • Caramelo","perfil":"Sofisticado","perfil_desc":"Elegância envolvente","sensacao":"Quentura","sensacao_desc":"Abraço reconfortante","ocasiao":"Noturna","ocasiao_desc":"Momento contemplativo"},
  "Ramos Gin Fizz":{"flavors":"Cítrico • Cremoso • Floral","perfil":"Luxuoso","perfil_desc":"Sedoso e refinado","sensacao":"Aveludado","sensacao_desc":"Macio na boca","ocasiao":"Brunch","ocasiao_desc":"Celebração matinal elegante"},
  "Vodka Tônica":{"flavors":"Refrescante • Cítrico • Herbal","perfil":"Clássico","perfil_desc":"Leve e equilibrado","sensacao":"Revigorante","sensacao_desc":"Frescor efervescente","ocasiao":"Casual","ocasiao_desc":"Tarde descontraída"},
  "Caipirinha Clássica":{"flavors":"Cítrico • Herbal • Refrescante","perfil":"Autêntica","perfil_desc":"Brasileira, descontraída, clássica","sensacao":"Revigorante","sensacao_desc":"Fresca, estimulante, leve","ocasiao":"Social","ocasiao_desc":"Encontros, celebrações, lazer"},
  "Caipirinha com Rapadura":{"flavors":"Doce • Cítrico • Terroso","perfil":"Rústico","perfil_desc":"Açúcar mascavo envolvente","sensacao":"Refrescante","sensacao_desc":"Acidez com dulçor","ocasiao":"Informal","ocasiao_desc":"Encontros descontraídos"},
  "Caipirinha de Limão-Cravo":{"flavors":"Especiado • Cítrico • Herbal","perfil":"Exótico","perfil_desc":"Tropical e aromático","sensacao":"Refrescante","sensacao_desc":"Gelado e envolvente","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Caipirinha de Três Limões":{"flavors":"Cítrico • Refrescante • Aromático","perfil":"Vibrante","perfil_desc":"Explosão de cítricos","sensacao":"Energizante","sensacao_desc":"Formigante e leve","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Caipirinha de Maracujá e Limão":{"flavors":"Tropical • Cítrico • Mel","perfil":"Refrescante","perfil_desc":"fresco e vibrante","sensacao":"Equilibrada","sensacao_desc":"suave e envolvente","ocasiao":"Verão","ocasiao_desc":"encontros descontraídos"},
  "Caipirinha de Abacaxi Tostado":{"flavors":"Tropical • Caramelizado • Cítrico","perfil":"Sofisticado","perfil_desc":"Doce e fumarado","sensacao":"Refrescante","sensacao_desc":"Quente e gelado","ocasiao":"Verão","ocasiao_desc":"Noites ao ar livre"},
  "Caipirinha de Cambuci":{"flavors":"Frutado • Cítrico • Herbal","perfil":"Refrescante","perfil_desc":"tropical e vivo","sensacao":"Energizante","sensacao_desc":"picante e revigorante","ocasiao":"Verão","ocasiao_desc":"encontros ao ar livre"},
  "Caipirinha de Limão-Siciliano e Capim-Santo":{"flavors":"Cítrico • Herbáceo • Refrescante","perfil":"Tropical","perfil_desc":"Exótico e aromático","sensacao":"Revigorante","sensacao_desc":"Fresco e estimulante","ocasiao":"Verão","ocasiao_desc":"Tarde ensolarada"},
  "Caipirinha de Tangerina Verde e Salina":{"flavors":"Cítrico • Mineral • Herbáceo","perfil":"Refrescante","perfil_desc":"Ácido e limpo","sensacao":"Vibrante","sensacao_desc":"Formigante e salino","ocasiao":"Verão","ocasiao_desc":"Tarde tropical ensolarada"},
  "Caipirinha de Caju e Mel":{"flavors":"Tropical • Melado • Cítrico","perfil":"Sedutora","perfil_desc":"Doce e refrescante","sensacao":"Suave","sensacao_desc":"Morna e envolvente","ocasiao":"Verão","ocasiao_desc":"Encontros ao entardecer"},
  "Caipirinha de Maracujá e Kaffir":{"flavors":"Tropical • Cítrico • Aromático","perfil":"Refrescante","perfil_desc":"Exótico e vibrante","sensacao":"Envolvente","sensacao_desc":"Suave e perfumada","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Caipirinha de Uva Verde":{"flavors":"Frutado • Cítrico • Suave","perfil":"Refrescante","perfil_desc":"leveza tropical","sensacao":"Sedoso","sensacao_desc":"maciez na boca","ocasiao":"Social","ocasiao_desc":"encontros descontraídos"},
  "Caipirinha de Caju Clássica":{"flavors":"Tropical • Cítrico • Doce","perfil":"Refrescante","perfil_desc":"Frutal e equilibrado","sensacao":"Revitalizante","sensacao_desc":"Fresco e suave","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Caju com Limão-Cravo":{"flavors":"Tropical • Aromático • Adstringente","perfil":"Exótico","perfil_desc":"Frutas tropicais e especiarias","sensacao":"Refrescante","sensacao_desc":"Quente e gelado","ocasiao":"Noite","ocasiao_desc":"Encontros descontraídos"},
  "Caju, Salina e Pimenta-Rosa":{"flavors":"Frutado • Salgado • Picante","perfil":"Sofisticado","perfil_desc":"Elegância tropical equilibrada","sensacao":"Refrescante","sensacao_desc":"Fresco com mordida","ocasiao":"Coquetel","ocasiao_desc":"Noite sofisticada"},
  "Caju Tostado":{"flavors":"Tostado • Cítrico • Amadeirado","perfil":"Sofisticado","perfil_desc":"Elegância tropical moderna","sensacao":"Envolvente","sensacao_desc":"Calor e suavidade","ocasiao":"Noturna","ocasiao_desc":"Conversas contemplativas"},
  "Caju e Louro":{"flavors":"Frutado • Herbal • Mel","perfil":"Sofisticado","perfil_desc":"tropical com elegância","sensacao":"Aromático","sensacao_desc":"folha e doçura","ocasiao":"Entardecer","ocasiao_desc":"momento contemplativo"},
  "Caju e Coco Seco":{"flavors":"Tropical • Tostado • Cítrico","perfil":"Encorpado","perfil_desc":"denso e cremoso","sensacao":"Reconfortante","sensacao_desc":"quentura tropical","ocasiao":"Entardecer","ocasiao_desc":"relaxamento ao pôr do sol"},
  "Caju Vínico":{"flavors":"Frutado • Cítrico • Herbal","perfil":"Sofisticado","perfil_desc":"elegância tropical amadeirada","sensacao":"Encorpado","sensacao_desc":"morno e aveludado","ocasiao":"Entardecer","ocasiao_desc":"contemplação requintada"},
  "Caipirinha de Caju com Rum de Coco":{"flavors":"Tropical • Cremoso • Cítrico","perfil":"Exótico","perfil_desc":"Doçura tropical envolvente","sensacao":"Refrescante","sensacao_desc":"Morneguinho confortável","ocasiao":"Verão","ocasiao_desc":"Praia ao entardecer"},
  "Caju & Oak":{"flavors":"Frutado • Amadeirado • Especiado","perfil":"Sofisticado","perfil_desc":"Tropical com estrutura","sensacao":"Envolvente","sensacao_desc":"Morno e reconfortante","ocasiao":"Entardecer","ocasiao_desc":"Momentos de reflexão"},
  "Jardim de Caju":{"flavors":"Tropical • Herbáceo • Cítrico","perfil":"Refrescante","perfil_desc":"luz frutal e verde","sensacao":"Suave","sensacao_desc":"toque macio e fluido","ocasiao":"Tarde","ocasiao_desc":"momentos de leveza"},
  "Caju Escuro":{"flavors":"Tropical • Amadeirado • Picante","perfil":"Sofisticado","perfil_desc":"Elegância frutada envelhecida","sensacao":"Suave","sensacao_desc":"Mornidão aromática envolvente","ocasiao":"Entardecer","ocasiao_desc":"Momento contemplativo aprimorado"},
  "Caju Bianco":{"flavors":"Frutado • Floral • Cítrico","perfil":"Tropical","perfil_desc":"Exótico e refrescante","sensacao":"Suave","sensacao_desc":"Macio e elegante","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Fumaça Tropical":{"flavors":"Fumado • Tropical • Equilibrado","perfil":"Sofisticado","perfil_desc":"Complexidade exótica e refinada","sensacao":"Envolvente","sensacao_desc":"Fumaça morna e sedutora","ocasiao":"Crepúsculo","ocasiao_desc":"Noites de contemplação"},
  "Caju Spritz":{"flavors":"Frutado • Aperitivo • Efervescente","perfil":"Tropical","perfil_desc":"Fresco e vibrante","sensacao":"Refrescante","sensacao_desc":"Leve e hormigueante","ocasiao":"Início de noite","ocasiao_desc":"Encontros ao entardecer"},
  "Caju Noturno":{"flavors":"Amadeirado • Frutado • Amargo","perfil":"Sofisticado","perfil_desc":"Noturno e envolvente","sensacao":"Encorpado","sensacao_desc":"Quente e profundo","ocasiao":"Pós-Jantar","ocasiao_desc":"Encontros contemplativos"},
  "Caju Verde":{"flavors":"Frutado • Cítrico • Herbáceo","perfil":"Tropical","perfil_desc":"Exótico e refrescante","sensacao":"Vivaz","sensacao_desc":"Leve e estimulante","ocasiao":"Verão","ocasiao_desc":"Tarde ensolarada"},
  "Maracujá Tônico":{"flavors":"Tropical • Cítrico • Herbal","perfil":"Refrescante","perfil_desc":"Leve e estimulante","sensacao":"Efervescente","sensacao_desc":"Bolhas vibrantes","ocasiao":"Tarde","ocasiao_desc":"Momento descontraído"},
  "Gold Passion":{"flavors":"Tropical • Amadeirado • Amargo","perfil":"Sofisticado","perfil_desc":"Elegância líquida calorosa","sensacao":"Envolvente","sensacao_desc":"Suavidade com corpo","ocasiao":"Noite","ocasiao_desc":"Momentos contemplados"},
  "Passo Solar":{"flavors":"Tropical • Cítrico • Mineral","perfil":"Refrescante","perfil_desc":"Solar e vivaz","sensacao":"Energizante","sensacao_desc":"Fresco na boca","ocasiao":"Dia","ocasiao_desc":"Tarde ensolarada"},
  "Maracujá Amargo":{"flavors":"Amargo • Cítrico • Herbal","perfil":"Sofisticado","perfil_desc":"elegância com acidez","sensacao":"Refrescante","sensacao_desc":"espuma vibrante","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar"},
  "Linha do Equador":{"flavors":"Tropical • Cítrico • Refrescante","perfil":"Exótico","perfil_desc":"Frutas tropicais vibrantes","sensacao":"Equilibrado","sensacao_desc":"Suave e revitalizante","ocasiao":"Verão","ocasiao_desc":"Drinks de praia"},
  "Pornstar Martini":{"flavors":"Tropical • Floral • Efervescente","perfil":"Sensual","perfil_desc":"Sofisticado e provocante","sensacao":"Refrescante","sensacao_desc":"Borbulhante e leve","ocasiao":"Noturna","ocasiao_desc":"Celebração elegante"},
  "Saturn":{"flavors":"Tropical • Almendrado • Cítrico","perfil":"Encantador","perfil_desc":"sofisticado e delicado","sensacao":"Sedoso","sensacao_desc":"macio e envolvente","ocasiao":"Início de noite","ocasiao_desc":"momento festivo e elegante"},
  "Cobra's Fang":{"flavors":"Tropical • Picante • Herbal","perfil":"Exótico","perfil_desc":"Frutas tropicais ardentes","sensacao":"Envolvente","sensacao_desc":"Calor aromático intenso","ocasiao":"Noturno","ocasiao_desc":"Coquetel de celebração"},
  "Passion Fruit Margarita":{"flavors":"Tropical • Cítrico • Refrescante","perfil":"Vibrante","perfil_desc":"Exuberante e equilibrado","sensacao":"Estimulante","sensacao_desc":"Fresco e revigorante","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Whiskey Sour de Maracujá":{"flavors":"Tropical • Cítrico • Suave","perfil":"Equilibrado","perfil_desc":"Doçura e acidez em harmonia","sensacao":"Cremoso","sensacao_desc":"Textura macia e envolvente","ocasiao":"Sofisticado","ocasiao_desc":"Encontros e celebrações"},
  "Highball de Cajuína":{"flavors":"Frutado • Suave • Refrescante","perfil":"Tropical","perfil_desc":"Doçura exótica nordestina","sensacao":"Leve","sensacao_desc":"Cremoso e efervescente","ocasiao":"Verão","ocasiao_desc":"Pausa tropical relaxante"},
  "Gin & Cajuína":{"flavors":"Frutado • Cítrico • Floral","perfil":"Refrescante","perfil_desc":"tropical e elegante","sensacao":"Leve","sensacao_desc":"suave e revigorante","ocasiao":"Tarde","ocasiao_desc":"encontros descontraídos"},
  "Rabo de Galo com Cajuína":{"flavors":"Frutado • Especiado • Adocicado","perfil":"Clássico","perfil_desc":"Elegante e equilibrado","sensacao":"Suave","sensacao_desc":"Morna e envolvente","ocasiao":"Tarde","ocasiao_desc":"Momentos contemplativoss"},
  "Cajuína & Mezcal":{"flavors":"Frutado • Defumado • Refrescante","perfil":"Exótico","perfil_desc":"Tropical com fumaça","sensacao":"Envolvente","sensacao_desc":"Quente e gelado","ocasiao":"Noite","ocasiao_desc":"Conversas descontraídas"},
  "Cajuína Old Fashioned":{"flavors":"Amadeirado • Frutado • Especiado","perfil":"Sofisticado","perfil_desc":"Elegância tropical nordestina","sensacao":"Aquecente","sensacao_desc":"Morno e envolvente","ocasiao":"Noite","ocasiao_desc":"Conversas contemplativas"},
  "Tequila & Cajuína":{"flavors":"Frutado • Refrescante • Terroso","perfil":"Tropical","perfil_desc":"Exótico e vibrante","sensacao":"Energizante","sensacao_desc":"Fresco e estimulante","ocasiao":"Verão","ocasiao_desc":"Dias quentes e ensolarados"},
  "Batida de Coco":{"flavors":"Cremoso • Tropical • Suave","perfil":"Envolvente","perfil_desc":"abraço líquido e morno","sensacao":"Sedosa","sensacao_desc":"maciez na língua","ocasiao":"Festas","ocasiao_desc":"celebração descontraída"},
  "Batida de Maracujá":{"flavors":"Tropical • Cremoso • Suave","perfil":"Refrescante","perfil_desc":"doce e frutado","sensacao":"Sedoso","sensacao_desc":"macio na boca","ocasiao":"Festivo","ocasiao_desc":"celebração descontraída"},
  "Cachaça Sour":{"flavors":"Cítrico • Herbáceo • Suave","perfil":"Refrescante","perfil_desc":"Equilibrado e revitalizante","sensacao":"Acetinado","sensacao_desc":"Macio na boca","ocasiao":"Início de noite","ocasiao_desc":"Momentos descontraídos"},
  "Quentão":{"flavors":"Especiado • Cítrico • Aquecente","perfil":"Reconfortante","perfil_desc":"aconchego líquido","sensacao":"Envolvente","sensacao_desc":"calor abraçador","ocasiao":"Noturna","ocasiao_desc":"encontros de inverno"},
  "Rabo de Galo":{"flavors":"Herbal • Amargo • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegante e contemplativo","sensacao":"Refrescante","sensacao_desc":"Tônico e revigorante","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Leite de Onça":{"flavors":"Cremoso • Especiado • Suave","perfil":"Tropical","perfil_desc":"Doçura envolvente","sensacao":"Aterciopelado","sensacao_desc":"Macio e aconchegante","ocasiao":"Sobremesa","ocasiao_desc":"Pós-jantar relaxante"},
  "Caju Amigo":{"flavors":"Frutado • Tropical • Refrescante","perfil":"Descontraído","perfil_desc":"Leve e jovial","sensacao":"Energizante","sensacao_desc":"Quente e fresco","ocasiao":"Casual","ocasiao_desc":"Encontros despreocupados"},
  "Macunaíma":{"flavors":"Herbal • Cítrico • Defumado","perfil":"Complexo","perfil_desc":"Tropical com amargura elegante","sensacao":"Provocante","sensacao_desc":"Queimação refrescante intensa","ocasiao":"Noturna","ocasiao_desc":"Coquetel de contemplação"},
  "Gabriela":{"flavors":"Especiado • Cítrico • Terroso","perfil":"Tradicional","perfil_desc":"Raízes brasileiras autênticas","sensacao":"Aquecente","sensacao_desc":"Abraço reconfortante","ocasiao":"Noturno","ocasiao_desc":"Encontros intimistas"},
  "Cachaça Collins":{"flavors":"Cítrico • Tropical • Refrescante","perfil":"Vibrante","perfil_desc":"Intenso e alegre","sensacao":"Efervescente","sensacao_desc":"Leve e estimulante","ocasiao":"Social","ocasiao_desc":"Festas e encontros"},
  "Old Fashioned de Cachaça":{"flavors":"Amadeirado • Cítrico • Especiado","perfil":"Robusto","perfil_desc":"Encorpado e intenso","sensacao":"Quente","sensacao_desc":"Abraço reconfortante","ocasiao":"Noturna","ocasiao_desc":"Contemplação relaxada"},
  "Caipirinha Envelhecida":{"flavors":"Amadeirado • Cítrico • Suave","perfil":"Sofisticado","perfil_desc":"Elegância envelhecida","sensacao":"Morno","sensacao_desc":"Calor reconfortante","ocasiao":"Início de noite","ocasiao_desc":"Encontros refinados"},
  "Honey & Wood":{"flavors":"Doce • Amadeirado • Cítrico","perfil":"Encorpado","perfil_desc":"Warmth e suavidade","sensacao":"Reconfortante","sensacao_desc":"Abraço líquido","ocasiao":"Noite","ocasiao_desc":"Repouso contemplativo"},
  "Julep Brasileiro":{"flavors":"Herbáceo • Amadeirado • Refrescante","perfil":"Tropical","perfil_desc":"Autêntico e envolvente","sensacao":"Revigorante","sensacao_desc":"Fresco e aromático","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Amaro Tropical":{"flavors":"Amargo • Cítrico • Amadeirado","perfil":"Sofisticado","perfil_desc":"Tropical e envolvente","sensacao":"Aquecimento","sensacao_desc":"Suave e reconfortante","ocasiao":"Pós-Jantar","ocasiao_desc":"Momento contemplativo"},
  "Madeira & Abacaxi":{"flavors":"Tropical • Suave • Encorpado","perfil":"Equilibrado","perfil_desc":"Doçura tropical com warmth alcoólico","sensacao":"Refrescante","sensacao_desc":"Leveza cítrica delicada","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada, conversa leve"},
  "Café com Cachaça":{"flavors":"Amadeirado • Caramelado • Encorpado","perfil":"Elegante","perfil_desc":"sofisticação tropical","sensacao":"Aquecente","sensacao_desc":"calor reconfortante","ocasiao":"Noturna","ocasiao_desc":"após refeição"},
  "Orchard Brasileiro":{"flavors":"Frutado • Suave • Encorpado","perfil":"Refinado","perfil_desc":"Elegância tropical equilibrada","sensacao":"Sedosa","sensacao_desc":"Morno e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Transição vespertina agradável"},
  "Cachaça Manhattan":{"flavors":"Madeirado • Amargado • Especiado","perfil":"Sofisticado","perfil_desc":"elegância tropical e aromática","sensacao":"Aquecente","sensacao_desc":"suavidade envolvente","ocasiao":"Noturna","ocasiao_desc":"conversas contemplativas"},
  "Spiced Cane":{"flavors":"Picante • Cítrico • Amadeirado","perfil":"Tropical","perfil_desc":"quente e refrescante","sensacao":"Vibrante","sensacao_desc":"ardor suave na garganta","ocasiao":"Noturno","ocasiao_desc":"drinks after dark"},
  "Rabo de Galo Envelhecido":{"flavors":"Amadeirado • Amargo • Herbal","perfil":"Sofisticado","perfil_desc":"Complexo e elegante","sensacao":"Aquecente","sensacao_desc":"Morno e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Sazerac Brasileiro":{"flavors":"Amadeirado • Herbal • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegância destilada","sensacao":"Envolvente","sensacao_desc":"Calor aromático","ocasiao":"Noturna","ocasiao_desc":"Contemplação refinada"},
  "Tropical Old Fashioned":{"flavors":"Tropical • Amadeirado • Especiado","perfil":"Sofisticado","perfil_desc":"Clássico reinventado tropicalmente","sensacao":"Envolvente","sensacao_desc":"Calor e docura equilibrada","ocasiao":"Entardecer","ocasiao_desc":"Momentos contemplativosRequintados"},
  "Brandy Alexander":{"flavors":"Chocolate • Conhaque • Cremoso","perfil":"Luxuoso","perfil_desc":"Elegância sedutora e sofisticada","sensacao":"Aveludado","sensacao_desc":"Macio e envolvente","ocasiao":"Noite","ocasiao_desc":"Momento de indulgência"},
  "Between the Sheets":{"flavors":"Cítrico • Sofisticado • Quente","perfil":"Clássico","perfil_desc":"Elegância atemporal","sensacao":"Sedutora","sensacao_desc":"Suave e envolvente","ocasiao":"Noturna","ocasiao_desc":"Momentos intimistas"},
  "Stinger":{"flavors":"Heráceo • Suave • Aquecido","perfil":"Refrescante","perfil_desc":"Menta cristalina dominante","sensacao":"Envolvente","sensacao_desc":"Frieza mentolada intensa","ocasiao":"Digestivo","ocasiao_desc":"Após refeição elegante"},
  "French Connection":{"flavors":"Suave • Aromático • Adocicado","perfil":"Elegante","perfil_desc":"sofisticado e equilibrado","sensacao":"Morna","sensacao_desc":"confortável e acariciante","ocasiao":"Digestivo","ocasiao_desc":"pós-refeição relaxante"},
  "Spicy Margarita":{"flavors":"Picante • Cítrico • Herbal","perfil":"Ousado","perfil_desc":"Refrescante com temperamento","sensacao":"Ardente","sensacao_desc":"Queimação agradável prolongada","ocasiao":"Festivo","ocasiao_desc":"Encontros animados e descontraídos"},
  "Ranch Water":{"flavors":"Cítrico • Mineral • Refrescante","perfil":"Minimalista","perfil_desc":"simplicidade elegante e limpa","sensacao":"Efervescente","sensacao_desc":"hormiga na língua","ocasiao":"Casual","ocasiao_desc":"tarde de calor intenso"},
  "Batanga":{"flavors":"Cítrico • Doce • Salgado","perfil":"Refrescante","perfil_desc":"Tropical e estimulante","sensacao":"Efervescente","sensacao_desc":"Borbulhante e vibrante","ocasiao":"Casual","ocasiao_desc":"Encontros descontraídos"},
  "Naked and Famous":{"flavors":"Herbal • Amargo • Cítrico","perfil":"Sofisticado","perfil_desc":"Complexo e elegante","sensacao":"Refrescante","sensacao_desc":"Fresco e estimulante","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Mezcal Sour":{"flavors":"Defumado • Cítrico • Terroso","perfil":"Sofisticado","perfil_desc":"Complexo e elegante","sensacao":"Aveludado","sensacao_desc":"Macio e envolvente","ocasiao":"Noite","ocasiao_desc":"Encontros refinados"},
  "Matador":{"flavors":"Tropical • Cítrico • Suave","perfil":"Refrescante","perfil_desc":"Leve e energizante","sensacao":"Vibrante","sensacao_desc":"Tropical na boca","ocasiao":"Verão","ocasiao_desc":"Dias quentes e ensolarados"},
  "Agave Spritz":{"flavors":"Cítrico • Doce • Refrescante","perfil":"Equilibrado","perfil_desc":"Harmonia entre agave e limão","sensacao":"Efervescente","sensacao_desc":"Leve e burbuljante","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada descontraída"},
  "Verde Brisa":{"flavors":"Tropical • Refrescante • Herbáceo","perfil":"Vibrante","perfil_desc":"Leve e energizante","sensacao":"Fresco","sensacao_desc":"Mentolado com leveza","ocasiao":"Dia","ocasiao_desc":"Tarde ensolarada"},
  "Sol e Sal":{"flavors":"Cítrico • Salgado • Floral","perfil":"Refrescante","perfil_desc":"Brightness tropical luminoso","sensacao":"Energizante","sensacao_desc":"Paladar desperto vibrante","ocasiao":"Tardinha","ocasiao_desc":"Momento sol poente"},
  "Sombra na Areia":{"flavors":"Defumado • Tropical • Cítrico","perfil":"Intrigante","perfil_desc":"Complexo e misterioso","sensacao":"Refrescante","sensacao_desc":"Suave queimação","ocasiao":"Entardecer","ocasiao_desc":"Momento contemplativo"},
  "Cacto Poético":{"flavors":"Herbal • Cítrico • Floral","perfil":"Sofisticado","perfil_desc":"elegância desértica","sensacao":"Refrescante","sensacao_desc":"leveza aromática","ocasiao":"Anoitecer","ocasiao_desc":"momentos contemplativos"},
  "Bruma de Agave":{"flavors":"Defumado • Cítrico • Agave","perfil":"Complexo","perfil_desc":"Fumaça e doçura equilibradas","sensacao":"Envolvente","sensacao_desc":"Calor aromático suave","ocasiao":"Entardecer","ocasiao_desc":"Momentos contemplativvos refinados"},
  "Fumaça de Frutas":{"flavors":"Frutado • Picante • Defumado","perfil":"Ousado","perfil_desc":"Complexo e desafiador","sensacao":"Ardente","sensacao_desc":"Queimação prolongada","ocasiao":"Noturna","ocasiao_desc":"Para momentos intensos"},
  "Vesper":{"flavors":"Herbal • Cítrico • Sofisticado","perfil":"Elegante","perfil_desc":"Refinado e envolvente","sensacao":"Seco","sensacao_desc":"Fresco e limpo","ocasiao":"Noite","ocasiao_desc":"Sofisticação e requinte"},
  "Bloody Mary":{"flavors":"Umami • Picante • Cítrico","perfil":"Clássico","perfil_desc":"Robusto e temperado","sensacao":"Refrescante","sensacao_desc":"Quente e revigorante","ocasiao":"Brunch","ocasiao_desc":"Repouso matinal elegante"},
  "Harvey Wallbanger":{"flavors":"Cítrico • Herbáceo • Suave","perfil":"Refrescante","perfil_desc":"Vibrante e tropical","sensacao":"Leve","sensacao_desc":"Macio e elegante","ocasiao":"Festivo","ocasiao_desc":"Tarde ensolarada"},
  "Sex on the Beach":{"flavors":"Frutado • Doce • Refrescante","perfil":"Tropical","perfil_desc":"vibrante e descontraído","sensacao":"Leve","sensacao_desc":"suave e envolvente","ocasiao":"Praia","ocasiao_desc":"momentos de diversão"},
  "Lemon Drop":{"flavors":"Cítrico • Doce • Refrescante","perfil":"Elegante","perfil_desc":"sofisticado e equilibrado","sensacao":"Vibrante","sensacao_desc":"fresco e estimulante","ocasiao":"Celebração","ocasiao_desc":"momentos especiais e alegres"},
  "Mule de Framboesa":{"flavors":"Frutado • Picante • Refrescante","perfil":"Vibrante","perfil_desc":"framboesa com gengibre","sensacao":"Efervescente","sensacao_desc":"cosquilho picante","ocasiao":"Verão","ocasiao_desc":"festas ao ar livre"},
  "El Presidente":{"flavors":"Encorpado • Elegante • Sofisticado","perfil":"Clássico","perfil_desc":"Diplomático e refinado","sensacao":"Suave","sensacao_desc":"Macio e envolvente","ocasiao":"Coquetel","ocasiao_desc":"Momento de distinção"},
  "Planter's Punch":{"flavors":"Tropical • Amargo • Frutado","perfil":"Clássico","perfil_desc":"elegância caribenha atemporal","sensacao":"Refrescante","sensacao_desc":"doce e penetrante","ocasiao":"Festivo","ocasiao_desc":"celebração tropical vibrante"},
  "Rum Old Fashioned":{"flavors":"Amadeirado • Caramelizado • Especiado","perfil":"Sofisticado","perfil_desc":"Elegância clássica e profunda","sensacao":"Aquecedor","sensacao_desc":"Abraço alcoólico reconfortante","ocasiao":"Noturna","ocasiao_desc":"Momentos de contemplação"},
  "Painkiller":{"flavors":"Tropical • Cremoso • Especiado","perfil":"Exótico","perfil_desc":"Praia caribenha tropical","sensacao":"Suave","sensacao_desc":"Macio e envolvente","ocasiao":"Relaxamento","ocasiao_desc":"Descanso à beira-mar"},
  "Mary Pickford":{"flavors":"Tropical • Frutado • Doce","perfil":"Clássico","perfil_desc":"Elegância tropical refrescante","sensacao":"Suave","sensacao_desc":"Seda na boca","ocasiao":"Tarde","ocasiao_desc":"Momento ensolarado"},
  "Tom Collins":{"flavors":"Cítrico • Floral • Refrescante","perfil":"Clássico","perfil_desc":"elegância atemporal","sensacao":"Leve","sensacao_desc":"efervescência alerta","ocasiao":"Tarde","ocasiao_desc":"encontro social descontraído"},
  "Corpse Reviver #2":{"flavors":"Cítrico • Herbal • Seco","perfil":"Clássico","perfil_desc":"elegância revigorante","sensacao":"Refrescante","sensacao_desc":"picante e leve","ocasiao":"Início de noite","ocasiao_desc":"despertar sensorial"},
  "White Lady":{"flavors":"Cítrico • Floral • Seco","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Cremosa","sensacao_desc":"Macia e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Momento celebrativo refinado"},
  "Hanky Panky":{"flavors":"Herbal • Amargo • Doce","perfil":"Sofisticado","perfil_desc":"Complexo e refinado","sensacao":"Envolvente","sensacao_desc":"Quente e sedutora","ocasiao":"Noturna","ocasiao_desc":"Encontros intimistas"},
  "Southside":{"flavors":"Cítrico • Herbal • Refrescante","perfil":"Clássico","perfil_desc":"Elegância citrina com toque de hortelã","sensacao":"Revigorante","sensacao_desc":"Frescor mentolado e limpo","ocasiao":"Verão","ocasiao_desc":"Tarde ensolarada, celebração"},
  "20th Century":{"flavors":"Floral • Cacauado • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegante e refinado","sensacao":"Aveludado","sensacao_desc":"Macio e envolvente","ocasiao":"Noturna","ocasiao_desc":"Momento de elegância"},
  "Black Manhattan":{"flavors":"Amargo • Especiado • Fumegante","perfil":"Sofisticado","perfil_desc":"Elegância redonda e intensa","sensacao":"Encorpado","sensacao_desc":"Pesado e envolvente","ocasiao":"Noite","ocasiao_desc":"Drinks contemplativo e profundo"},
  "Toronto":{"flavors":"Amargo • Especiado • Sofisticado","perfil":"Clássico","perfil_desc":"Coquetel histórico robusto","sensacao":"Intenso","sensacao_desc":"Queimação reconfortante","ocasiao":"Noturna","ocasiao_desc":"Conversas profundas"},
  "Blood and Sand":{"flavors":"Frutado • Amargo • Doce","perfil":"Clássico","perfil_desc":"Equilibrado e sofisticado","sensacao":"Aveludada","sensacao_desc":"Morna e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Transição do dia"},
  "Horse's Neck":{"flavors":"Picante • Amadeirada • Cítrica","perfil":"Clássico","perfil_desc":"Elegante e sofisticado","sensacao":"Refrescante","sensacao_desc":"Hormigueo especiado","ocasiao":"Coquetel","ocasiao_desc":"Aperitivo relaxante"},
  "Highland Orchard":{"flavors":"Frutado • Herbáceo • Adocicado","perfil":"Sofisticado","perfil_desc":"Elegância aromática suave","sensacao":"Refrescante","sensacao_desc":"Leve e espumante","ocasiao":"Início de noite","ocasiao_desc":"Momentos contemplativosatardecer"},
  "Honey & Heather":{"flavors":"Herbal • Melado • Aromático","perfil":"Sofisticado","perfil_desc":"Complexo e envolvente","sensacao":"Reconfortante","sensacao_desc":"Quente e adocicado","ocasiao":"Noturna","ocasiao_desc":"Após jantar elegante"},
  "Golden Citrus Fizz":{"flavors":"Mel • Cítrico • Floral","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Efervescente","sensacao_desc":"Leve e aérea","ocasiao":"Início de noite","ocasiao_desc":"Momentos celebrativos"},
  "Autumn Smoke":{"flavors":"Amadeirado • Defumado • Adocicado","perfil":"Envolvente","perfil_desc":"Quente e misterioso","sensacao":"Reconfortante","sensacao_desc":"Fumaça adocicada","ocasiao":"Noite","ocasiao_desc":"Momento contemplativo"},
  "Bitter Hive":{"flavors":"Amargo • Cítrico • Herbal","perfil":"Sofisticado","perfil_desc":"Elegância em copo","sensacao":"Provocante","sensacao_desc":"Queimação doce","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Spiced Nightcap":{"flavors":"Mel • Chocolate • Especiado","perfil":"Sofisticado","perfil_desc":"Elegância adocicada e envolvente","sensacao":"Reconfortante","sensacao_desc":"Calor e maciez abraçadora","ocasiao":"Noturna","ocasiao_desc":"Repouso contemplativo e aconchego"},
  "Barley Highball":{"flavors":"Herbal • Doce • Terroso","perfil":"Sofisticado","perfil_desc":"Elegância cereal e mel","sensacao":"Refrescante","sensacao_desc":"Efervescência suave e leve","ocasiao":"Início de noite","ocasiao_desc":"Momento de contemplação"},
  "Tropical Heather":{"flavors":"Doce • Tropical • Herbáceo","perfil":"Exótico","perfil_desc":"Frutas tropicais com mel","sensacao":"Suave","sensacao_desc":"Morno e sedoso","ocasiao":"Festas","ocasiao_desc":"Celebrações ensolaradas"},
  "Elder Fashion":{"flavors":"Floral • Amadeirado • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância e refinamento","sensacao":"Suave","sensacao_desc":"morno e envolvente","ocasiao":"Noturna","ocasiao_desc":"encontros elegantes"},
  "French Gimlet":{"flavors":"Floral • Cítrico • Herbáceo","perfil":"Elegante","perfil_desc":"sofisticado e refinado","sensacao":"Fresco","sensacao_desc":"leve e revigorante","ocasiao":"Início de noite","ocasiao_desc":"momento de sofisticação"},
  "St-Germain Sour":{"flavors":"Floral • Cítrico • Suave","perfil":"Elegante","perfil_desc":"sofisticado e refinado","sensacao":"Aveludada","sensacao_desc":"macia e envolvente","ocasiao":"Coquetel","ocasiao_desc":"aperitivo de luxo"},
  "The Harvest":{"flavors":"Floral • Frutado • Refrescante","perfil":"Elegante","perfil_desc":"sofisticação de pomar","sensacao":"Efervescente","sensacao_desc":"bolhas delicadas dançando","ocasiao":"Brunch","ocasiao_desc":"celebração matinal luminosa"},
  "Jardim Elétrico":{"flavors":"Floral • Cítrico • Herbal","perfil":"Refrescante","perfil_desc":"Luminoso e vivaz","sensacao":"Equilibrado","sensacao_desc":"Suave e estimulante","ocasiao":"Início de noite","ocasiao_desc":"Momento social e descontraído"},
  "Pera & Fumaça":{"flavors":"Frutado • Amadeirado • Floral","perfil":"Sofisticado","perfil_desc":"elegância adocicada","sensacao":"Envolvente","sensacao_desc":"fumaça suave","ocasiao":"Entardecer","ocasiao_desc":"contemplação requintada"},
  "Citrus Cloud":{"flavors":"Floral • Cítrico • Mel","perfil":"Delicado","perfil_desc":"Elegância leve e sofisticada","sensacao":"Aveludado","sensacao_desc":"Espuma sedosa na boca","ocasiao":"Início de noite","ocasiao_desc":"Momento refinado e social"},
  "Vinho de Jardim":{"flavors":"Floral • Cítrico • Mineral","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Fresco","sensacao_desc":"Leve e efervescente","ocasiao":"Tarde","ocasiao_desc":"Momento tranquilo"},
  "Chá da Tarde":{"flavors":"Floral • Herbáceo • Cítrico","perfil":"Refinado","perfil_desc":"Elegante e sofisticado","sensacao":"Refrescante","sensacao_desc":"Leve e envolvente","ocasiao":"Tarde","ocasiao_desc":"Pausa contemplativa"},
  "Dourado Amargo":{"flavors":"Amargo • Floral • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância bittersweet","sensacao":"Refrescante","sensacao_desc":"amargura sedutora","ocasiao":"Início de noite","ocasiao_desc":"pré-jantar refinado"},
  "Estufa":{"flavors":"Floral • Refrescante • Herbáceo","perfil":"Delicado","perfil_desc":"Elegância verde e luminosa","sensacao":"Revigorante","sensacao_desc":"Frescor mineral tocante","ocasiao":"Primavera","ocasiao_desc":"Tarde ensolarada e leve"},
  "Flor Rubra":{"flavors":"Floral • Frutado • Suave","perfil":"Elegante","perfil_desc":"Sofisticado e equilibrado","sensacao":"Refrescante","sensacao_desc":"Leve e sedoso","ocasiao":"Início de noite","ocasiao_desc":"Encontros sofisticados"},
  "Floral Mule Leve":{"flavors":"Floral • Cítrico • Picante","perfil":"Refrescante","perfil_desc":"Leve e elegante","sensacao":"Espumante","sensacao_desc":"Burbujas efervescentes","ocasiao":"Coquetel","ocasiao_desc":"Tarde ensolarada"},
  "Tuxedo":{"flavors":"Herbal • Seco • Sofisticado","perfil":"Clássico","perfil_desc":"elegância destilada","sensacao":"Refinado","sensacao_desc":"suavidade amargosa","ocasiao":"Noturna","ocasiao_desc":"encontros formais"},
  "Rose":{"flavors":"Floral • Herbal • Cítrico","perfil":"Elegante","perfil_desc":"sofisticado e refinado","sensacao":"Fresco","sensacao_desc":"leve e envolvente","ocasiao":"Início de noite","ocasiao_desc":"momentos especiais"},
  "Strega Sour":{"flavors":"Herbal • Cítrico • Floral","perfil":"Sofisticado","perfil_desc":"Elegância cremosa","sensacao":"Aveludado","sensacao_desc":"Espuma sedosa","ocasiao":"Noite","ocasiao_desc":"Encontro refinado"},
  "Strega Spritz":{"flavors":"Herbáceo • Floral • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegante e refinado","sensacao":"Efervescente","sensacao_desc":"Leve e refrescante","ocasiao":"Início de noite","ocasiao_desc":"Momentos sociais descontraídos"},
  "Italian Buck":{"flavors":"Herbal • Cítrico • Picante","perfil":"Refrescante","perfil_desc":"Herbáceo e efervescente","sensacao":"Estimulante","sensacao_desc":"Formigante e vivo","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Witch's Kiss":{"flavors":"Herbal • Cítrico • Mel","perfil":"Misterioso","perfil_desc":"Complexo e envolvente","sensacao":"Sedutora","sensacao_desc":"Quente e suave","ocasiao":"Noturna","ocasiao_desc":"Encontros intimistas"},
  "Benevento Old Fashioned":{"flavors":"Herbal • Amadeirado • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegância amarga e quente","sensacao":"Envolvente","sensacao_desc":"Calor sedoso na garganta","ocasiao":"Noturna","ocasiao_desc":"Conversas contemplativas"},
  "Golden Bee":{"flavors":"Herbal • Cítrico • Melado","perfil":"Encantador","perfil_desc":"Doce e aromático","sensacao":"Suave","sensacao_desc":"Morno e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Tarde tranquila"},
  "Strega Martini":{"flavors":"Herbal • Citrina • Seca","perfil":"Sofisticado","perfil_desc":"elegante e refinado","sensacao":"Equilibrada","sensacao_desc":"fresca e equilibrada","ocasiao":"Social","ocasiao_desc":"encontros descontraídos"},
  "Strega Coffee Flip":{"flavors":"Herbal • Cafeínico • Cremoso","perfil":"Sofisticado","perfil_desc":"Elegância amarga e adocicada","sensacao":"Aveludado","sensacao_desc":"Textura morna e envolvente","ocasiao":"Digestivo","ocasiao_desc":"Encerramento refinado"},
  "Strega Highball":{"flavors":"Herbal • Cítrico • Refrescante","perfil":"Sofisticado","perfil_desc":"Elegância descomplicada","sensacao":"Efervescente","sensacao_desc":"Burbujas leves","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Giardino Giallo":{"flavors":"Herbal • Cítrico • Floral","perfil":"Sofisticado","perfil_desc":"elegância aromática italiana","sensacao":"Refrescante","sensacao_desc":"luminoso e equilibrado","ocasiao":"Início de noite","ocasiao_desc":"tarde ensolarada"},
  "Zafferano Tonic":{"flavors":"Herbal • Cítrico • Floral","perfil":"Sofisticado","perfil_desc":"Elegância aromática italiana","sensacao":"Refrescante","sensacao_desc":"Leveza burbuante","ocasiao":"Início de noite","ocasiao_desc":"Encontros ao entardecer"},
  "Ervas & Casca":{"flavors":"Herbal • Cítrico • Amargo","perfil":"Aromático","perfil_desc":"Ervas complexas, laranja vibrante","sensacao":"Refrescante","sensacao_desc":"Leve, estimulante, elegante","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar, conversas"},
  "Campo Noturno":{"flavors":"Herbal • Melífero • Terroso","perfil":"Contemplativo","perfil_desc":"Noturno e reconfortante","sensacao":"Envolvente","sensacao_desc":"Morno e acalentador","ocasiao":"Anoitecer","ocasiao_desc":"Repouso e introspecção"},
  "Ouro & Fumaça":{"flavors":"Herbal • Doce • Defumado","perfil":"Sofisticado","perfil_desc":"Elegância aromática e complexa","sensacao":"Envolvente","sensacao_desc":"Fumaça quente e mel","ocasiao":"Noite","ocasiao_desc":"Momentos contemplativosIntrospecção"},
  "Freddo di Benevento":{"flavors":"Herbal • Cítrico • Refrescante","perfil":"Elegante","perfil_desc":"sofisticação gelada","sensacao":"Revigorante","sensacao_desc":"frio intenso","ocasiao":"Início de noite","ocasiao_desc":"momento contemplativo"},
  "Fruto Secreto":{"flavors":"Floral • Frutado • Mel","perfil":"Sofisticado","perfil_desc":"Elegância herbácea doce","sensacao":"Morno","sensacao_desc":"Envolvimento agradável","ocasiao":"Pós-Jantar","ocasiao_desc":"Momentos contemplativosintimos"},
  "Golden Orchard":{"flavors":"Herbal • Cítrico • Frutado","perfil":"Sofisticado","perfil_desc":"elegância verdejante","sensacao":"Refrescante","sensacao_desc":"leveza efervescente","ocasiao":"Início de noite","ocasiao_desc":"momento elegante"},
  "Noite em Benevento":{"flavors":"Amargo • Herbal • Tostado","perfil":"Sofisticado","perfil_desc":"Elegância noturna italiana","sensacao":"Envolvente","sensacao_desc":"Calor reconfortante profundo","ocasiao":"Pós-jantar","ocasiao_desc":"Conversas contemplativas lentas"},
  "Citrus Incantation":{"flavors":"Cítrico • Herbal • Doce","perfil":"Luminoso","perfil_desc":"brilho amargo-doce","sensacao":"Refrescante","sensacao_desc":"efervescência bucal","ocasiao":"Início de noite","ocasiao_desc":"momento jovial"},
  "Campo Alto":{"flavors":"Herbal • Fresco • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância verde e luminosa","sensacao":"Refrescante","sensacao_desc":"toque crocante e leve","ocasiao":"Início de noite","ocasiao_desc":"momento de conversas agradáveis"},
  "Tropical Esotérico":{"flavors":"Herbal • Tropical • Melado","perfil":"Exótico","perfil_desc":"mistério tropical aromático","sensacao":"Envolvente","sensacao_desc":"quente e refrescante","ocasiao":"Entardecer","ocasiao_desc":"celebração ensolarada"},
  "Strega & Tonic Verde":{"flavors":"Herbáceo • Cítrico • Floral","perfil":"Refrescante","perfil_desc":"Verde e aromático","sensacao":"Efervescente","sensacao_desc":"Leve e estimulante","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Golden Orange Fizz":{"flavors":"Cítrico • Herbal • Efervescente","perfil":"Refrescante","perfil_desc":"Alegre e descontraído","sensacao":"Vibrante","sensacao_desc":"Leve e estimulante","ocasiao":"Social","ocasiao_desc":"Encontros descontraídos"},
  "Alpine Highball":{"flavors":"Herbal • Cítrico • Amargo","perfil":"Aromático","perfil_desc":"Fresco e sofisticado","sensacao":"Refrescante","sensacao_desc":"Leve e estimulante","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Floral Witch":{"flavors":"Floral • Herbal • Doce","perfil":"Encantador","perfil_desc":"Misterioso e elegante","sensacao":"Refrescante","sensacao_desc":"Leve e efervescente","ocasiao":"Noturna","ocasiao_desc":"Eventos sofisticados"},
  "Bitter Sunshine":{"flavors":"Amargo • Herbáceo • Cítrico","perfil":"Aperitivo","perfil_desc":"elegância refrescante","sensacao":"Efervescente","sensacao_desc":"burbujas leves","ocasiao":"Tarde","ocasiao_desc":"sol dourado"},
  "Bamboo":{"flavors":"Seco • Herbal • Cítrico","perfil":"Clássico","perfil_desc":"elegância vintage e refinada","sensacao":"Sofisticado","sensacao_desc":"leveza mineral tátil","ocasiao":"Início de noite","ocasiao_desc":"pausa contemplativa sofisticada"},
  "Adonis":{"flavors":"Seco • Herbal • Cítrico","perfil":"Refinado","perfil_desc":"elegância fortificada","sensacao":"Suave","sensacao_desc":"macio e envolvente","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar"},
  "Sherry Cobbler":{"flavors":"Frutado • Floral • Equilibrado","perfil":"Sofisticado","perfil_desc":"Elegância refrescante","sensacao":"Suave","sensacao_desc":"Toque sedoso","ocasiao":"Tarde","ocasiao_desc":"Momento contemplativo"},
  "Rebujito":{"flavors":"Fresco • Herbáceo • Cítrico","perfil":"Refrescante","perfil_desc":"leve e descontraído","sensacao":"Efervescente","sensacao_desc":"borbulhante na boca","ocasiao":"Verão","ocasiao_desc":"tardes ensolaradas"},
  "Tío Pepe & Tônica":{"flavors":"Seco • Mineral • Amargo","perfil":"Clássico","perfil_desc":"elegância ibérica refrescante","sensacao":"Crisp","sensacao_desc":"leveza efervescente","ocasiao":"Início de noite","ocasiao_desc":"tarde ensolarada"},
  "Sherry Highball":{"flavors":"Seco • Cítrico • Mineral","perfil":"Elegante","perfil_desc":"Sofisticado e leve","sensacao":"Refrescante","sensacao_desc":"Espumante e vivaz","ocasiao":"Início de noite","ocasiao_desc":"Momento de descontração"},
  "Sherry Sour":{"flavors":"Seco • Cítrico • Encorpado","perfil":"Sofisticado","perfil_desc":"Elegância envelhecida","sensacao":"Suave","sensacao_desc":"Sedoso e equilibrado","ocasiao":"Início de noite","ocasiao_desc":"Encontros refinados"},
  "East India Sour":{"flavors":"Doce • Amargo • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegância e complexidade","sensacao":"Sedoso","sensacao_desc":"Macio e reconfortante","ocasiao":"Início de noite","ocasiao_desc":"Momento contemplativo refinado"},
  "Sherry Old Fashioned":{"flavors":"Oxidado • Amargo • Doce","perfil":"Sofisticado","perfil_desc":"Elegância envelhecida","sensacao":"Aquecente","sensacao_desc":"Calidez prolongada","ocasiao":"Noturna","ocasiao_desc":"Contemplação e repouso"},
  "Coronation Cocktail":{"flavors":"Sofisticado • Cítrico • Amargado","perfil":"Elegante","perfil_desc":"Refinado e complexo","sensacao":"Encorpado","sensacao_desc":"Morno e envolvente","ocasiao":"Coquetel","ocasiao_desc":"Aperitivo formal e celebrativo"},
  "Bosco Notturno":{"flavors":"Amargo • Cítrico • Herbáceo","perfil":"Sofisticado","perfil_desc":"Elegância noturna italiana","sensacao":"Refrescante","sensacao_desc":"Fresco e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Entardecer contemplativo"},
  "Caramello Spritz":{"flavors":"Amargo • Frutado • Efervescente","perfil":"Sofisticado","perfil_desc":"elegância italiana refinada","sensacao":"Refrescante","sensacao_desc":"burbujas leves vibrantes","ocasiao":"Início de noite","ocasiao_desc":"momento social descontraído"},
  "Nero Fizz":{"flavors":"Amargo • Cítrico • Cremoso","perfil":"Sofisticado","perfil_desc":"elegância amarga e refrescante","sensacao":"Sedoso","sensacao_desc":"textura aveludada e leve","ocasiao":"Início de noite","ocasiao_desc":"início de noite especial"},
  "Sicilian Orchard":{"flavors":"Amargo • Frutado • Especiado","perfil":"Aromático","perfil_desc":"Herbal e acaramelado","sensacao":"Quentinho","sensacao_desc":"Abraço reconfortante","ocasiao":"Crepúsculo","ocasiao_desc":"Final de tarde contemplativo"},
  "Amaro Tonic Café":{"flavors":"Amargo • Cafeínico • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegância amarga e moderna","sensacao":"Revigorante","sensacao_desc":"Espumante e despertador","ocasiao":"Pós-jantar","ocasiao_desc":"Digestivo estimulante noturno"},
  "Dark Tropic":{"flavors":"Amargo • Tropical • Picante","perfil":"Exótico","perfil_desc":"Frutas tropicais e especiarias","sensacao":"Refrescante","sensacao_desc":"Quente e estimulante","ocasiao":"Noite","ocasiao_desc":"Drinks sofisticados e elegantes"},
  "Jardim Noturno":{"flavors":"Herbal • Floral • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância verde e doce","sensacao":"Refrescante","sensacao_desc":"efervescência delicada","ocasiao":"Noturna","ocasiao_desc":"encontros intimistas"},
  "Maçã Verde Elétrica":{"flavors":"Herbal • Cítrico • Frutado","perfil":"Refrescante","perfil_desc":"Limpo e vibrante","sensacao":"Elétrico","sensacao_desc":"Formigante na língua","ocasiao":"Início de noite","ocasiao_desc":"Início de noite"},
  "Fennel Tonic":{"flavors":"Herbal • Fresco • Amargo","perfil":"Sofisticado","perfil_desc":"elegância botânica refinada","sensacao":"Refrescante","sensacao_desc":"formigamento herbal mentolado","ocasiao":"Início de noite","ocasiao_desc":"encontro pré-jantar elegante"},
  "Solar Verde":{"flavors":"Herbal • Cítrico • Refrescante","perfil":"Aperitivo","perfil_desc":"Elegante e estimulante","sensacao":"Vivaz","sensacao_desc":"Espumante na boca","ocasiao":"Pré-jantar","ocasiao_desc":"Momento de contemplação solar"},
  "Vinha Fantasma":{"flavors":"Anisado • Frutado • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegante e misterioso","sensacao":"Refrescante","sensacao_desc":"Efervescente e envolvente","ocasiao":"Coquetel","ocasiao_desc":"Noites especiais e sofisticadas"},
  "Mate Verde":{"flavors":"Herbal • Cítrico • Anisado","perfil":"Refrescante","perfil_desc":"Verde e vibrante","sensacao":"Estimulante","sensacao_desc":"Energizante e revigorante","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Abacaxi Anisado":{"flavors":"Anisado • Tropical • Refrescante","perfil":"Sofisticado","perfil_desc":"Elegante e equilibrado","sensacao":"Energizante","sensacao_desc":"Formigante e vibrante","ocasiao":"Início de noite","ocasiao_desc":"Encontros noturnos chic"},
  "Green Shandy":{"flavors":"Herbáceo • Cítrico • Refrescante","perfil":"Sofisticado","perfil_desc":"erva e trigo","sensacao":"Efervescente","sensacao_desc":"leve e picante","ocasiao":"Início de noite","ocasiao_desc":"tarde ensolarada"},
  "Fernet & Coke":{"flavors":"Amargo • Mentolado • Caramelizado","perfil":"Descontraído","perfil_desc":"clássico e acessível","sensacao":"Refrescante","sensacao_desc":"fresco e estimulante","ocasiao":"Social","ocasiao_desc":"encontro descontraído"},
  "Industry Sour":{"flavors":"Amargo • Herbal • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância amarga e verde","sensacao":"Refrescante","sensacao_desc":"picância herbal fresca","ocasiao":"Início de noite","ocasiao_desc":"antes de refeição"},
  "Porto Tônico Tinto":{"flavors":"Frutado • Amargo • Sofisticado","perfil":"Elegante","perfil_desc":"Refinado e envolvente","sensacao":"Refrescante","sensacao_desc":"Espumante e leve","ocasiao":"Início de noite","ocasiao_desc":"Encontros sofisticados"},
  "Porto Flip":{"flavors":"Encorpado • Especiado • Sedoso","perfil":"Clássico","perfil_desc":"Elegância atemporal","sensacao":"Aveludado","sensacao_desc":"Macio e envolvente","ocasiao":"Noturna","ocasiao_desc":"Repouso e conforto"},
  "Porto Negroni":{"flavors":"Amargo • Sofisticado • Frutado","perfil":"Clássico","perfil_desc":"Elegância encorpada","sensacao":"Aquecimento","sensacao_desc":"Suavidade envolvente","ocasiao":"Início de noite","ocasiao_desc":"Pôr do sol refinado"},
  "Porto Branco & Tônica":{"flavors":"Cítrico • Herbal • Elegante","perfil":"Refrescante","perfil_desc":"Leve e equilibrado","sensacao":"Espumante","sensacao_desc":"Bolhas vibrantes","ocasiao":"Início de noite","ocasiao_desc":"Início sofisticado"},
  "Porto Branco Sour":{"flavors":"Cítrico • Suave • Encorpado","perfil":"Elegante","perfil_desc":"refinado e equilibrado","sensacao":"Sedoso","sensacao_desc":"macio na boca","ocasiao":"Início de noite","ocasiao_desc":"início de noite"},
  "Porto Branco Spritz":{"flavors":"Floral • Cítrico • Delicado","perfil":"Refinado","perfil_desc":"Elegância efervescente","sensacao":"Refrescante","sensacao_desc":"Leveza gaseificada","ocasiao":"Início de noite","ocasiao_desc":"Momento social relaxado"},
  "Lillet Vive":{"flavors":"Floral • Refrescante • Frutal","perfil":"Elegante","perfil_desc":"Sofisticado e leve","sensacao":"Efervescente","sensacao_desc":"Burbujas vibrantes","ocasiao":"Início de noite","ocasiao_desc":"Momento social relaxado"},
  "Lillet Berry":{"flavors":"Frutado • Refrescante • Herbáceo","perfil":"Elegante","perfil_desc":"Sofisticado e leve","sensacao":"Efervescente","sensacao_desc":"Burbujas vibrantes","ocasiao":"Início de noite","ocasiao_desc":"Início de noite"},
  "Lillet & Gin Highball":{"flavors":"Floral • Cítrico • Herbal","perfil":"Refinado","perfil_desc":"Elegante e sofisticado","sensacao":"Fresco","sensacao_desc":"Efervescente e leve","ocasiao":"Início de noite","ocasiao_desc":"Início de noite"},
  "Lillet Honey Lemon":{"flavors":"Floral • Melado • Cítrico","perfil":"Delicado","perfil_desc":"Elegância doce e fresca","sensacao":"Refrescante","sensacao_desc":"Leveza espumante","ocasiao":"Início de noite","ocasiao_desc":"Manhã luminosa"},
  "White Negroni Tropical":{"flavors":"Herbal • Amargo • Floral","perfil":"Sofisticado","perfil_desc":"elegância amargada e fresca","sensacao":"Refinado","sensacao_desc":"toque seco e envolvente","ocasiao":"Início de noite","ocasiao_desc":"momento de contemplação e conversa"},
  "Lillet Garden Spritz":{"flavors":"Floral • Frutado • Refrescante","perfil":"Elegante","perfil_desc":"Sofisticado e leve","sensacao":"Efervescente","sensacao_desc":"Vibrante na boca","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Cynar Sunset Highball":{"flavors":"Amargo • Floral • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância aperitivo refinado","sensacao":"Refrescante","sensacao_desc":"leveza efervescente","ocasiao":"Entardecer","ocasiao_desc":"momento golden hour"},
  "French Aviation (hack)":{"flavors":"Floral • Amargo • Cítrico","perfil":"Elegante","perfil_desc":"sofisticado e equilibrado","sensacao":"Refrescante","sensacao_desc":"leve e vibrante","ocasiao":"Início de noite","ocasiao_desc":"início de noite"},
  "Lillet Orchard":{"flavors":"Floral • Mel • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância frutada e doce","sensacao":"Sedoso","sensacao_desc":"macio e envolvente","ocasiao":"Início de noite","ocasiao_desc":"encontro refinado e descontraído"},
  "Almost Martini":{"flavors":"Herbáceo • Floral • Seco","perfil":"Sofisticado","perfil_desc":"Elegância contida e refinada","sensacao":"Fresco","sensacao_desc":"Cristalino e envolvente","ocasiao":"Coquetel","ocasiao_desc":"Aperitivo entre amigos"},
  "Horta & Laranja Queimada":{"flavors":"Amargo • Cítrico • Herbal","perfil":"Sofisticado","perfil_desc":"Elegância aromática e terrosa","sensacao":"Refrescante","sensacao_desc":"Queimação cítrica suave","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar especial"},
  "Lillet Gold Rush":{"flavors":"Floral • Cítrico • Mel","perfil":"Sofisticado","perfil_desc":"elegante e refinado","sensacao":"Suave","sensacao_desc":"macio e envolvente","ocasiao":"Início de noite","ocasiao_desc":"início de noite elegante"},
  "White Orchard Martini":{"flavors":"Floral • Frutado • Herbal","perfil":"Sofisticado","perfil_desc":"elegância em copo","sensacao":"Refrescante","sensacao_desc":"leveza primaveril","ocasiao":"Início de noite","ocasiao_desc":"encontros refinados"},
  "Solar Highball":{"flavors":"Cítrico • Floral • Refrescante","perfil":"Luminoso","perfil_desc":"Brilho solar em copo","sensacao":"Efervescente","sensacao_desc":"Leveza gaseificada","ocasiao":"Tarde","ocasiao_desc":"Momento ensolarado"},
  "Lillet Spritz":{"flavors":"Floral • Cítrico • Elegante","perfil":"Refinado","perfil_desc":"leveza buquê aromático","sensacao":"Efervescente","sensacao_desc":"frescor borbulhante","ocasiao":"Início de noite","ocasiao_desc":"encontro sofisticado"},
  "French Pearl":{"flavors":"Herbal • Cítrico • Floral","perfil":"Sofisticado","perfil_desc":"elegância parisiense e frescor","sensacao":"Refrescante","sensacao_desc":"mentol suave e luminoso","ocasiao":"Início de noite","ocasiao_desc":"encontros refinados e elegantes"},
  "Lillet & Tônica":{"flavors":"Cítrico • Floral • Amargo","perfil":"Refinado","perfil_desc":"elegância leve e sofisticada","sensacao":"Refrescante","sensacao_desc":"fresco e estimulante","ocasiao":"Início de noite","ocasiao_desc":"início perfeito da noite"},
  "Jasmine":{"flavors":"Floral • Amargo • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância equilibrada","sensacao":"Refrescante","sensacao_desc":"vivacidade aromatic","ocasiao":"Coquetel","ocasiao_desc":"aperitivo refinado"},
  "Lillet Rosé Spritz":{"flavors":"Frutado • Floral • Refrescante","perfil":"Elegante","perfil_desc":"Sofisticado e leve","sensacao":"Espumante","sensacao_desc":"Efervescente na boca","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Cynar Tônica":{"flavors":"Amargo • Cítrico • Herbáceo","perfil":"Refrescante","perfil_desc":"leve e vivificante","sensacao":"Espumante","sensacao_desc":"burbujeante na boca","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar"},
  "Black Negroni":{"flavors":"Amargo • Mentolado • Cítrico","perfil":"Sofisticado","perfil_desc":"complexo e intenso","sensacao":"Refrescante","sensacao_desc":"menta gelada","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar"},
  "Fernet Sour":{"flavors":"Amargo • Cítrico • Floral","perfil":"Sofisticado","perfil_desc":"Elegância herbal complexa","sensacao":"Sedoso","sensacao_desc":"Cremoso e aveludado","ocasiao":"Noturna","ocasiao_desc":"Digestivo pós-jantar"},
  "Fernet Ginger Highball":{"flavors":"Picante • Amargo • Cítrico","perfil":"Estimulante","perfil_desc":"Refrescante e revigorante","sensacao":"Ardente","sensacao_desc":"Queimação picante prolongada","ocasiao":"Início de noite","ocasiao_desc":"Antes da refeição"},
  "Fernet Spritz":{"flavors":"Amargo • Cítrico • Efervescente","perfil":"Sofisticado","perfil_desc":"elegância com atitude","sensacao":"Refrescante","sensacao_desc":"formigamento aromatic o","ocasiao":"Início de noite","ocasiao_desc":"encontros sociais chiques"},
  "Jardim Suspenso":{"flavors":"Amargo • Refrescante • Herbáceo","perfil":"Sofisticado","perfil_desc":"Elegância verde e brilhante","sensacao":"Revigorante","sensacao_desc":"Frescor mentolado leve","ocasiao":"Início de noite","ocasiao_desc":"Tardinha ensolarada elegante"},
  "Bitter Milk Punch":{"flavors":"Amargo • Cremoso • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância reconfortante","sensacao":"Aveludado","sensacao_desc":"suavidade quente","ocasiao":"Entardecer","ocasiao_desc":"momento contemplativo"},
  "Vinho Fantasma":{"flavors":"Amargo • Encorpado • Sofisticado","perfil":"Clássico","perfil_desc":"elegância com profundidade","sensacao":"Envolvente","sensacao_desc":"cobertura aveludada","ocasiao":"Noite","ocasiao_desc":"contemplação sofisticada"},
  "Rubor Picante":{"flavors":"Amargo • Picante • Cítrico","perfil":"Ousado","perfil_desc":"Intenso e desafiador","sensacao":"Ardente","sensacao_desc":"Queimação refrescante","ocasiao":"Noturna","ocasiao_desc":"Happy hour sofisticado"},
  "Espresso Amaro Highball":{"flavors":"Amargo • Encorpado • Refrescante","perfil":"Sofisticado","perfil_desc":"elegância bitter-cafeinada","sensacao":"Estimulante","sensacao_desc":"vibrante e despertadora","ocasiao":"Início de noite","ocasiao_desc":"pós-almoço revigorante"},
  "Casca & Fumaça":{"flavors":"Amargo • Defumado • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância com arestas","sensacao":"Envolvente","sensacao_desc":"fumaça quente penetrante","ocasiao":"Noturna","ocasiao_desc":"drinks pós-jantares"},
  "Bitter & Melão":{"flavors":"Amargo • Doce • Frutado","perfil":"Sofisticado","perfil_desc":"elegância amarga e mel","sensacao":"Refrescante","sensacao_desc":"melão suave, final seco","ocasiao":"Happy Hour","ocasiao_desc":"encontros ao entardecer"},
  "Campari Lemon Tonic":{"flavors":"Amargo • Cítrico • Refrescante","perfil":"Sofisticado","perfil_desc":"elegância brilhante e equilibrada","sensacao":"Espumante","sensacao_desc":"formigamento palatal agradável","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar requintado"},
  "Laranja & Sal":{"flavors":"Amargo • Cítrico • Salgado","perfil":"Refrescante","perfil_desc":"Vibrante e desafiador","sensacao":"Provocante","sensacao_desc":"Picante na língua","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Highball Picante":{"flavors":"Amargo • Cítrico • Picante","perfil":"Refrescante","perfil_desc":"Efervescente e estimulante","sensacao":"Ardente","sensacao_desc":"Queimação suave prolongada","ocasiao":"Início de noite","ocasiao_desc":"Noites quentes vibrantes"},
  "Uva Amarga":{"flavors":"Amargo • Frutado • Refrescante","perfil":"Aperitivo","perfil_desc":"elegância amarga e cítrica","sensacao":"Efervescente","sensacao_desc":"bolhas leves na boca","ocasiao":"Coquetail","ocasiao_desc":"antes do jantar social"},
  "Bitter Ginger Highball":{"flavors":"Amargo • Picante • Cítrico","perfil":"Vibrante","perfil_desc":"Refrescante e estimulante","sensacao":"Ardente","sensacao_desc":"Queimadura picante agradável","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Verde & Amargo":{"flavors":"Amargo • Frutado • Herbáceo","perfil":"Aperitivo","perfil_desc":"Refrescante e sofisticado","sensacao":"Revigorante","sensacao_desc":"Pungente e vivificante","ocasiao":"Pré-jantar","ocasiao_desc":"Momento de descontração"},
  "Tomate Highball":{"flavors":"Amargo • Umami • Refrescante","perfil":"Savory","perfil_desc":"Sofisticado e terroso","sensacao":"Vibrante","sensacao_desc":"Picante e efervescente","ocasiao":"Início de noite","ocasiao_desc":"Tarde social elegante"},
  "Sangria":{"flavors":"Frutado • Cítrico • Suave","perfil":"Refrescante","perfil_desc":"Bebida social e leve","sensacao":"Equilibrada","sensacao_desc":"Harmonia frutal agradável","ocasiao":"Verão","ocasiao_desc":"Encontros ao ar livre"},
  "Virgin Mojito":{"flavors":"Refrescante • Cítrico • Herbáceo","perfil":"Leve","perfil_desc":"Toque minimalista e puro","sensacao":"Revigorante","sensacao_desc":"Frescor na boca","ocasiao":"Diurno","ocasiao_desc":"Tarde ensolarada"},
  "Shirley Temple":{"flavors":"Doce • Cítrico • Refrescante","perfil":"Infantil","perfil_desc":"Alegre e descomplicado","sensacao":"Efervescente","sensacao_desc":"Burbujas leves e alegres","ocasiao":"Infantil","ocasiao_desc":"Festas e celebrações familiares"},
  "Arnold Palmer":{"flavors":"Refrescante • Cítrico • Suave","perfil":"Clássico","perfil_desc":"Elegância descomplicada","sensacao":"Revitalizante","sensacao_desc":"Frescor prolongado","ocasiao":"Tarde","ocasiao_desc":"Pausa energizante"},
  "Hibiscus Fizz":{"flavors":"Floral • Cítrico • Refrescante","perfil":"Elegante","perfil_desc":"Sofisticado e vibrante","sensacao":"Efervescente","sensacao_desc":"Leve e espumante","ocasiao":"Brunch","ocasiao_desc":"Tarde ao sol"},
  "Cucumber Cooler":{"flavors":"Fresco • Herbáceo • Cítrico","perfil":"Refrescante","perfil_desc":"leveza vegetal cristalina","sensacao":"Estimulante","sensacao_desc":"frieza mentolada vivificante","ocasiao":"Verão","ocasiao_desc":"tarde ensolarada descontraída"},
  "Água de Coco Spritz":{"flavors":"Tropical • Refrescante • Cítrico","perfil":"Leve","perfil_desc":"Doce e efervescente","sensacao":"Revigorante","sensacao_desc":"Fresco na boca","ocasiao":"Verão","ocasiao_desc":"Tarde tropical descontraída"},
  "Virgin Margarita":{"flavors":"Cítrico • Doce • Refrescante","perfil":"Tropical","perfil_desc":"Explosão cítrica equilibrada","sensacao":"Vivificante","sensacao_desc":"Fresco e estimulante","ocasiao":"Dia","ocasiao_desc":"Perfeito para tarde"},
  "Ginger Lemonade":{"flavors":"Picante • Cítrico • Refrescante","perfil":"Energizante","perfil_desc":"Explosão revigorante","sensacao":"Efervescente","sensacao_desc":"Formigamento agradável","ocasiao":"Verão","ocasiao_desc":"Dias quentes e luminosos"},
  "Shrub de Frutas Vermelhas":{"flavors":"Frutado • Azedo • Refrescante","perfil":"Vibrante","perfil_desc":"Frutas vermelhas vivas","sensacao":"Efervescente","sensacao_desc":"Burbujas na língua","ocasiao":"Tarde","ocasiao_desc":"Momento leve e social"},
  "Solar Fizz":{"flavors":"Cítrico • Refrescante • Luminoso","perfil":"Efervescente","perfil_desc":"Borbulhas vibrantes","sensacao":"Estimulante","sensacao_desc":"Fresco e energizante","ocasiao":"Dia","ocasiao_desc":"Momento descontraído"},
  "Jardim Alto":{"flavors":"Fresco • Herbal • Cítrico","perfil":"Jardim","perfil_desc":"Verde e aromático","sensacao":"Refrescante","sensacao_desc":"Efervescente e leve","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Trópico Seco":{"flavors":"Tropical • Especiado • Amadeirado","perfil":"Exótico","perfil_desc":"Frutas tropicais aquecidas","sensacao":"Envolvente","sensacao_desc":"Calor especiado suave","ocasiao":"Entardecer","ocasiao_desc":"Momento de contemplação"},
  "Rubi Tônico":{"flavors":"Frutado • Refrescante • Herbáceo","perfil":"Elegante","perfil_desc":"sofisticado e leve","sensacao":"Efervescente","sensacao_desc":"burbujas na boca","ocasiao":"Social","ocasiao_desc":"encontros descontraídos"},
  "Linha Clara":{"flavors":"Cristalino • Mineral • Herbáceo","perfil":"Minimalista","perfil_desc":"Elegância destilada e pura","sensacao":"Refrescante","sensacao_desc":"Leve toque salgado","ocasiao":"Início de noite","ocasiao_desc":"Encontros sofisticados"},
  "Flor de Pressa":{"flavors":"Floral • Efervescente • Delicado","perfil":"Sofisticado","perfil_desc":"Elegância em taça","sensacao":"Refrescante","sensacao_desc":"Burbujas leves, florais","ocasiao":"Celebração","ocasiao_desc":"Momentos especiais, brunch"},
  "Dourado Frio":{"flavors":"Mielado • Cítrico • Suave","perfil":"Elegante","perfil_desc":"Refinado e equilibrado","sensacao":"Fresco","sensacao_desc":"Gelado, envolvente","ocasiao":"Início de noite","ocasiao_desc":"Momento sofisticado"},
  "Névoa Verde":{"flavors":"Floral • Frutado • Cítrico","perfil":"Delicado","perfil_desc":"Elegância suave e sofisticada","sensacao":"Refrescante","sensacao_desc":"Leveza adocicada e vibrante","ocasiao":"Coquetel","ocasiao_desc":"Tardes ensolaradas, encontros"},
  "Xarope Simples":{"flavors":"Doce • Limpo • Neutro","perfil":"Clássico","perfil_desc":"açúcar puro cristalino","sensacao":"Suave","sensacao_desc":"untuosidade líquida lisa","ocasiao":"Base","ocasiao_desc":"coquetel fundamentalmente versátil"},
  "Xarope Rico":{"flavors":"Doce • Cristalino • Neutro","perfil":"Clássico","perfil_desc":"base pura e versátil","sensacao":"Suave","sensacao_desc":"textura líquida morna","ocasiao":"Fundamental","ocasiao_desc":"ingrediente essencial mixologia"},
  "Xarope Demerara":{"flavors":"Caramelado • Melado • Tropical","perfil":"Encorpado","perfil_desc":"Xarope viscoso e denso","sensacao":"Aveludado","sensacao_desc":"Macio e envolvente","ocasiao":"Coquetel","ocasiao_desc":"Base para drinks sofisticados"},
  "Xarope de Agave":{"flavors":"Doce • Floral • Suave","perfil":"Néctar","perfil_desc":"Doçura líquida pura","sensacao":"Sedoso","sensacao_desc":"Macio na boca","ocasiao":"Repouso","ocasiao_desc":"Momento de calma"},
  "Xarope de Mel":{"flavors":"Floral • Melado • Suave","perfil":"Reconfortante","perfil_desc":"Doçura envolvente","sensacao":"Aquecedor","sensacao_desc":"Calor aconchegante","ocasiao":"Noturno","ocasiao_desc":"Repouso tranquilo"},
  "Xarope de Gengibre":{"flavors":"Picante • Doce • Aromático","perfil":"Revigorante","perfil_desc":"Energizante e aquecedor","sensacao":"Ardente","sensacao_desc":"Queimação picante prolongada","ocasiao":"Inverno","ocasiao_desc":"Resfriados e frio intenso"},
  "Xarope de Canela":{"flavors":"Quente • Doce • Aromático","perfil":"Reconfortante","perfil_desc":"Envolvente e acolhedor","sensacao":"Suave","sensacao_desc":"Morno e sedoso","ocasiao":"Inverno","ocasiao_desc":"Noites frias"},
  "Xarope de Cardamomo":{"flavors":"Aromático • Especiado • Adocicado","perfil":"Refinado","perfil_desc":"elegância aromática intensa","sensacao":"Quente","sensacao_desc":"calor especiado suave","ocasiao":"Coquetel","ocasiao_desc":"base sofisticada premium"},
  "Xarope de Lavanda":{"flavors":"floral • herbal • doce","perfil":"Elegante","perfil_desc":"sofisticação aromática","sensacao":"Calmante","sensacao_desc":"repouso perfumado","ocasiao":"Coquetel","ocasiao_desc":"momentos refinados"},
  "Xarope de Hibisco":{"flavors":"Floral • Tânico • Levemente Ácido","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Refrescante","sensacao_desc":"Vibrante e revitalizante","ocasiao":"Coquetel","ocasiao_desc":"Base para drinks premium"},
  "Xarope de Hortelã":{"flavors":"Fresco • Mentolado • Adocicado","perfil":"Refrescante","perfil_desc":"Claridade verde menta","sensacao":"Gelado","sensacao_desc":"Friozinho na boca","ocasiao":"Verão","ocasiao_desc":"Dias quentes e longos"},
  "Cordial de Limão":{"flavors":"Cítrico • Doce • Floral","perfil":"Refrescante","perfil_desc":"Brightness limpo e puro","sensacao":"Vivificante","sensacao_desc":"Formigamento na língua","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Cordial de Toranja":{"flavors":"Cítrico • Amargo • Floral","perfil":"Refrescante","perfil_desc":"Brilhante e tonificante","sensacao":"Vibrante","sensacao_desc":"Estimulante e energética","ocasiao":"Início de noite","ocasiao_desc":"Início de celebração"},
  "Cordial de Sabugueiro":{"flavors":"Floral • Cítrico • Doce","perfil":"Elegante","perfil_desc":"Sofisticado e refinado","sensacao":"Refrescante","sensacao_desc":"Leve e vivificante","ocasiao":"Primavera","ocasiao_desc":"Dias ensolarados e festivos"},
  "Cordial de Framboesa":{"flavors":"Frutado • Doce • Ácido","perfil":"Refrescante","perfil_desc":"Intenso e vibrante","sensacao":"Suave","sensacao_desc":"Macio na boca","ocasiao":"Verão","ocasiao_desc":"Dias quentes e ensolarados"},
  "Cordial de Cítricos Clarificado":{"flavors":"Cítrico • Suave • Cremoso","perfil":"Refrescante","perfil_desc":"Brightness equilibrado com doçura","sensacao":"Sedoso","sensacao_desc":"Textura morna e aveludada","ocasiao":"Início de noite","ocasiao_desc":"Momento leve e elegante"},
  "Cordial de Frutas Vermelhas com Chá":{"flavors":"Frutado • Floral • Ácido","perfil":"Refrescante","perfil_desc":"doce e vibrante","sensacao":"Sedoso","sensacao_desc":"textura morna","ocasiao":"Verão","ocasiao_desc":"tarde tranquila"},
  "Cordial Verde":{"flavors":"Herbáceo • Refrescante • Cítrico","perfil":"Aromático","perfil_desc":"Ervas frescas e vibrantes","sensacao":"Revigorante","sensacao_desc":"Frescor intenso e leve","ocasiao":"Verão","ocasiao_desc":"Dias quentes e ensolarados"},
  "Cordial de Abacaxi com Especiarias":{"flavors":"Tropical • Especiado • Ácido","perfil":"Encorpado","perfil_desc":"denso e envolvente","sensacao":"Quente","sensacao_desc":"picante e aquecedor","ocasiao":"Início de noite","ocasiao_desc":"antes de refeições"},
  "Cordial de Pêra Assada":{"flavors":"Doce • Frutado • Especiado","perfil":"Rústico","perfil_desc":"Aconchego caseiro","sensacao":"Morninho","sensacao_desc":"Calor reconfortante","ocasiao":"Tarde","ocasiao_desc":"Pausa contemplativa"},
  "Grenadine Caseira":{"flavors":"Frutado • Doce • Floral","perfil":"Luxuoso","perfil_desc":"Romã sedosa e sofisticada","sensacao":"Terciopelado","sensacao_desc":"Suave e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Momentos elegantes e especiais"},
  "Xarope de amêndoa (Orgeat)":{"flavors":"Cremoso • Floral • Adocicado","perfil":"Clássico","perfil_desc":"elegância tropical ancestral","sensacao":"Aterciopelado","sensacao_desc":"macio e envolvente","ocasiao":"Coquetel","ocasiao_desc":"base versátil e sofisticada"},
  "Falernum Caseiro":{"flavors":"Adocicado • Especiado • Amêndoado","perfil":"Aromático","perfil_desc":"Intensamente perfumado e complexo","sensacao":"Envolvente","sensacao_desc":"Morno e reconfortante","ocasiao":"Digestivo","ocasiao_desc":"Encerramento sofisticado"},
  "Champagne Cocktail":{"flavors":"Sofisticado • Efervescente • Aromático","perfil":"Elegante","perfil_desc":"Refinado e celebratório","sensacao":"Delicado","sensacao_desc":"Espumante na língua","ocasiao":"Festivo","ocasiao_desc":"Momentos especiais"},
  "Mint Julep":{"flavors":"Fresco • Doce • Herbáceo","perfil":"Refrescante","perfil_desc":"Menta vibrante e suave","sensacao":"Gelado","sensacao_desc":"Frio estimulante","ocasiao":"Verão","ocasiao_desc":"Tarde ensolarada"},
  "Rusty Nail":{"flavors":"Amadeirado • Herbal • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância escocesa clássica","sensacao":"Aquecente","sensacao_desc":"calor envolvente suave","ocasiao":"Noturna","ocasiao_desc":"depois do jantar"},
  "French Martini":{"flavors":"Frutado • Elegante • Tropical","perfil":"Sofisticado","perfil_desc":"Refinado e sensual","sensacao":"Suave","sensacao_desc":"Macio e envolvente","ocasiao":"Coquetel","ocasiao_desc":"Encontros noturnos elegantes"},
  "Gibson":{"flavors":"Herbáceo • Seco • Umami","perfil":"Elegante","perfil_desc":"Sofisticado e mineral","sensacao":"Refrescante","sensacao_desc":"Fresco e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Angel Face":{"flavors":"Frutado • Floral • Suave","perfil":"Elegante","perfil_desc":"Sofisticado e delicado","sensacao":"Aveludada","sensacao_desc":"Morna e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Encontros refinados"},
  "Monkey Gland":{"flavors":"Cítrico • Herbal • Frutado","perfil":"Exótico","perfil_desc":"Tropical e sofisticado","sensacao":"Refrescante","sensacao_desc":"Leve e estimulante","ocasiao":"Coquetel","ocasiao_desc":"Clássico vintage"},
  "Brandy Crusta":{"flavors":"Sofisticado • Cítrico • Amadeirado","perfil":"Elegante","perfil_desc":"Refinado e complexo","sensacao":"Equilibrado","sensacao_desc":"Suave e envolvente","ocasiao":"Noturna","ocasiao_desc":"Momento de distinção"},
  "Casino":{"flavors":"Herbal • Floral • Cítrico","perfil":"Sofisticado","perfil_desc":"elegância clássica britânica","sensacao":"Refrescante","sensacao_desc":"leveza aromática vibrante","ocasiao":"Coquetel","ocasiao_desc":"aperitivo de boas-vindas"},
  "Paradise":{"flavors":"Frutado • Floral • Cítrico","perfil":"Tropical","perfil_desc":"Exótico e refrescante","sensacao":"Suave","sensacao_desc":"Macio na boca","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Old Cuban":{"flavors":"Tropical • Herbal • Sofisticado","perfil":"Elegante","perfil_desc":"Refinado e celebrativo","sensacao":"Efervescente","sensacao_desc":"Leve e refrescante","ocasiao":"Coquetel","ocasiao_desc":"Momentos especiais noturnos"},
  "Yellow Bird":{"flavors":"Cítrico • Herbal • Tropical","perfil":"Luminoso","perfil_desc":"Brilhante e refrescante","sensacao":"Suave","sensacao_desc":"Macio e envolvente","ocasiao":"Início de noite","ocasiao_desc":"Clima quente e descontraído"},
  "Trinidad Sour":{"flavors":"Amargo • Doce • Cítrico","perfil":"Intenso","perfil_desc":"complexo e ousado","sensacao":"Equilibrado","sensacao_desc":"sedoso e refrescante","ocasiao":"Noturna","ocasiao_desc":"aperfeiçoamento do paladar"},
  "Barracuda":{"flavors":"Tropical • Floral • Refrescante","perfil":"Vibrante","perfil_desc":"Exuberante e animado","sensacao":"Espumante","sensacao_desc":"Leve e efervescente","ocasiao":"Celebração","ocasiao_desc":"Festas e encontros sociais"},
  "Tipperary":{"flavors":"Herbal • Doce • Especiado","perfil":"Complexo","perfil_desc":"Ervas e mel","sensacao":"Aterciopelado","sensacao_desc":"Morno e envolvente","ocasiao":"Noturna","ocasiao_desc":"Meditativo e introspectivo"},
  "Suffering Bastard":{"flavors":"Picante • Cítrico • Amadeirado","perfil":"Vibrante","perfil_desc":"Espirituoso e refrescante","sensacao":"Pungente","sensacao_desc":"Queimação agradável","ocasiao":"Noturna","ocasiao_desc":"Drinks de bar autêntico"},
  "Illegal Sour":{"flavors":"Defumado • Tropical • Amargo","perfil":"Complexo","perfil_desc":"Especiado e frutado","sensacao":"Refrescante","sensacao_desc":"Picante e envolvente","ocasiao":"Noturna","ocasiao_desc":"Exploração sofisticada"},
  "Russian Spring Punch":{"flavors":"Frutado • Cítrico • Elegante","perfil":"Sofisticado","perfil_desc":"Refinado e festivo","sensacao":"Efervescente","sensacao_desc":"Leve e refrescante","ocasiao":"Brunch","ocasiao_desc":"Momentos celebrativos"},
  "El Diablo":{"flavors":"Picante • Frutado • Refrescante","perfil":"Diabólico","perfil_desc":"Tequila ardente e sofisticado","sensacao":"Efervescente","sensacao_desc":"Formigamento na língua","ocasiao":"Festa","ocasiao_desc":"Noites animadas e descontraídas"},
  "Bloody Maria":{"flavors":"Picante • Umami • Cítrico","perfil":"Robusto","perfil_desc":"Encorpado e vibrante","sensacao":"Ardente","sensacao_desc":"Queimação refrescante","ocasiao":"Brunch","ocasiao_desc":"Manhã descontraída"},
  "Salty Dog":{"flavors":"Cítrico • Salgado • Refrescante","perfil":"Clássico","perfil_desc":"elegância descontraída","sensacao":"Revigorante","sensacao_desc":"picância salgada","ocasiao":"Tarde","ocasiao_desc":"happy hour refrescante"},
  "Bronx Cocktail":{"flavors":"Cítrico • Herbal • Equilibrado","perfil":"Sofisticado","perfil_desc":"Elegância clássica refinada","sensacao":"Refrescante","sensacao_desc":"Toque agridoce suave","ocasiao":"Início de noite","ocasiao_desc":"Encontros vespertinos elegantes"},
  "Pimm's Cup":{"flavors":"Refrescante • Herbáceo • Frutado","perfil":"Clássico","perfil_desc":"Elegância britânica tradicional","sensacao":"Leve","sensacao_desc":"Toque efervescente suave","ocasiao":"Jardim","ocasiao_desc":"Tardes ensolaradas inglesas"},
  "Zombie":{"flavors":"Tropical • Picante • Amadeirado","perfil":"Exótico","perfil_desc":"Complexo e envolvente","sensacao":"Refrescante","sensacao_desc":"Cítrico e adocicado","ocasiao":"Festa","ocasiao_desc":"Celebração animada"},
  "Grasshopper":{"flavors":"Refrescante • Doce • Cremoso","perfil":"Sobremesa","perfil_desc":"Elegância líquida em copo","sensacao":"Suave","sensacao_desc":"Menta gelada envolvente","ocasiao":"Após-jantar","ocasiao_desc":"Encerramento indulgente"},
  "Golden Dream":{"flavors":"Cítrico • Cremoso • Doce","perfil":"Elegante","perfil_desc":"Sofisticado e equilibrado","sensacao":"Sedoso","sensacao_desc":"Macio na boca","ocasiao":"Celebração","ocasiao_desc":"Momentos especiais"},
  "Cachanchara":{"flavors":"Melado • Cítrico • Suave","perfil":"Rustico","perfil_desc":"Autêntico e descontraído","sensacao":"Reconfortante","sensacao_desc":"Quente e envolvente","ocasiao":"Noite","ocasiao_desc":"Conversa e descontração"},
  "Collins de Toranja com Ervas":{"flavors":"Cítrico • Herbal • Refrescante","perfil":"Vibrante","perfil_desc":"Fresco e energético","sensacao":"Estimulante","sensacao_desc":"Leve e vivificante","ocasiao":"Início de noite","ocasiao_desc":"Tarde ensolarada"},
  "Grapefruit Gimlet":{"flavors":"Cítrico • Amargo • Floral","perfil":"Refrescante","perfil_desc":"seco e estimulante","sensacao":"Vivaz","sensacao_desc":"pungente na boca","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar"},
  "Spritz de Toranja":{"flavors":"Cítrico • Efervescente • Refrescante","perfil":"Alegre","perfil_desc":"Vibrante e descontraído","sensacao":"Leve","sensacao_desc":"Burbujeante na boca","ocasiao":"Início de noite","ocasiao_desc":"Tardes ensolaradas"},
  "Highball de Toranja e Bourbon":{"flavors":"Cítrico • Amadeirado • Refrescante","perfil":"Equilibrado","perfil_desc":"doçura e acidez","sensacao":"Revigorante","sensacao_desc":"efervescência agradável","ocasiao":"Início de noite","ocasiao_desc":"encontros descontraídos"},
  "Margarita Laranja Sanguínea e Aperol":{"flavors":"Cítrico • Amargo • Frutado","perfil":"Refrescante","perfil_desc":"Vibrante e equilibrado","sensacao":"Efervescente","sensacao_desc":"Leve e estimulante","ocasiao":"Início de noite","ocasiao_desc":"Noites de celebração"},
  "Key Lime Pie Margarita":{"flavors":"Cítrico • Cremoso • Amanteigado","perfil":"Dessert","perfil_desc":"Coquetel açucarado e indulgente","sensacao":"Refrescante","sensacao_desc":"Gelado e macio","ocasiao":"Sobremesa","ocasiao_desc":"Final doce e elegante"},
  "Margarita Ancho Chili e Toranja":{"flavors":"Picante • Cítrico • Frutado","perfil":"Ousado","perfil_desc":"temperado e refrescante","sensacao":"Equilibrado","sensacao_desc":"ardor suave e clima","ocasiao":"Social","ocasiao_desc":"encontros animados e descontraídos"},
  "Margarita Picante de Pepino":{"flavors":"Picante • Refrescante • Herbáceo","perfil":"Sofisticado","perfil_desc":"elegante e contemporâneo","sensacao":"Vibrante","sensacao_desc":"fresco e ardente","ocasiao":"Início de noite","ocasiao_desc":"encontros sociais descontraídos"},
  "Alaska":{"flavors":"Herbáceo • Floral • Especiado","perfil":"Sofisticado","perfil_desc":"Complexo e elegante","sensacao":"Refrescante","sensacao_desc":"Fresco e vibrante","ocasiao":"Noite","ocasiao_desc":"Aperitivo requintado"},
  "Bijou":{"flavors":"Herbal • Aromático • Complexo","perfil":"Elegante","perfil_desc":"sofisticado e equilibrado","sensacao":"Warming","sensacao_desc":"quente e envolvente","ocasiao":"Início de noite","ocasiao_desc":"antes de refeição"},
  "Brown Derby":{"flavors":"Cítrico • Amadeirado • Melado","perfil":"Sofisticado","perfil_desc":"elegância clássica americana","sensacao":"Reconfortante","sensacao_desc":"calor doce e envolvente","ocasiao":"Início de noite","ocasiao_desc":"encontros elegantes noturnos"},
  "Champs-Élysées":{"flavors":"Herbal • Cítrico • Sofisticado","perfil":"Elegante","perfil_desc":"Refinado e complexo","sensacao":"Encorpado","sensacao_desc":"Morno e envolvente","ocasiao":"Noite","ocasiao_desc":"Momento celebratório"},
  "Cynar Spritz":{"flavors":"Amargo • Cítrico • Efervescente","perfil":"Aperitivo","perfil_desc":"Leve e refrescante","sensacao":"Vivaz","sensacao_desc":"Bolhas dancing na língua","ocasiao":"Tarde","ocasiao_desc":"Momento descontraído social"},
  "Pegu Club":{"flavors":"Cítrico • Herbal • Amargo","perfil":"Clássico","perfil_desc":"Equilibrado e sofisticado","sensacao":"Refrescante","sensacao_desc":"Fresco e vibrante","ocasiao":"Início de noite","ocasiao_desc":"Antes do jantar"},
  "Remember the Maine":{"flavors":"Amargado • Herbal • Especiado","perfil":"Clássico","perfil_desc":"Potente e sofisticado","sensacao":"Envolvente","sensacao_desc":"Quente e complexo","ocasiao":"Noite","ocasiao_desc":"Contemplação reflexiva"},
  "Jungle Bird Maraschino":{"flavors":"Tropical • Amargo • Doce","perfil":"Exótico","perfil_desc":"Floresta tropical intensificada","sensacao":"Refrescante","sensacao_desc":"Picante e suave","ocasiao":"Festiva","ocasiao_desc":"Noite descontraída"},
  "Highball de Amburana & Sal":{"flavors":"Madeirado • Salino • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegante e mineral","sensacao":"Refrescante","sensacao_desc":"Espumante e revigorante","ocasiao":"Início de noite","ocasiao_desc":"Noites de celebração"},
  "Cachaça & Jerez":{"flavors":"Amadeirado • Seco • Cítrico","perfil":"Sofisticado","perfil_desc":"Elegância destilada e envelhecida","sensacao":"Quente","sensacao_desc":"Abraço sedoso na garganta","ocasiao":"Noturna","ocasiao_desc":"Conversas intelectuais prolongadas"},
  "Mezcal & Cenoura Queimada":{"flavors":"Defumado • Terroso • Caramelizado","perfil":"Complexo","perfil_desc":"Fumaça envolvente e tostada","sensacao":"Ardente","sensacao_desc":"Calor picante persistente","ocasiao":"Noturna","ocasiao_desc":"Contemplativos finais de noite"},
  "Cynar & Soda Salina":{"flavors":"Amargo • Mineral • Refrescante","perfil":"Sofisticado","perfil_desc":"elegância herbácea e salgada","sensacao":"Equilibrado","sensacao_desc":"leveza com profundidade","ocasiao":"Início de noite","ocasiao_desc":"antes do jantar"},
  "Kingston Mineral":{"flavors":"Tanínico • Especiado • Mineral","perfil":"Elegante","perfil_desc":"Sofisticado e terroso","sensacao":"Refrescante","sensacao_desc":"Fresco com calor","ocasiao":"Início de noite","ocasiao_desc":"Final de tarde"}
};

export default function OnTheRocks(){
  const [user,setUser]=useState(null);
  const [syncing,setSyncing]=useState(false);

  const [showTutorial,setShowTutorial]=useState(()=>!localStorage.getItem("otr_tutorial_done"));
  const closeTutorial=useCallback(()=>{localStorage.setItem("otr_tutorial_done","1");setShowTutorial(false);},[]);

  const [customRecipes,setCustomRecipes]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_custom")||"[]");}catch{return[];}});
  const [favs,setFavs]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_favs")||"[]");}catch{return[];}});
  const [comanda,setComanda]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_comanda")||"[]");}catch{return[];}});
  const [comandaReorder,setComandaReorder]=useState(false);
  const [comandaGroups,setComandaGroups]=useState(()=>{try{return JSON.parse(localStorage.getItem('otr_comanda_groups')||'[]');}catch{return[];}});
  const [comandaLongPress,setComandaLongPress]=useState(null);
  const [showNewGroupInput,setShowNewGroupInput]=useState(false);
  const [newGroupName,setNewGroupName]=useState('');
  const [editGroupId,setEditGroupId]=useState(null);
  const [editGroupName,setEditGroupName]=useState('');
  const [ungroupedCollapsed,setUngroupedCollapsed]=useState(false);
  const pressTimerRef=useRef(null);
  const [owned,setOwned]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_owned")||"[]");}catch{return[];}});
  const [tried,setTried]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_tried")||"[]");}catch{return[];}});
  const [customSpirits,setCustomSpirits]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_spirits")||"[]");}catch{return[];}});
  const [overrides,setOverrides]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_overrides")||"{}");}catch{return{};}});
  const [customBgs,setCustomBgs]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_custom_bgs")||"{}");}catch{return{};}});
  const [customBgOffsets,setCustomBgOffsets]=useState(()=>{try{return JSON.parse(localStorage.getItem("otr_bg_offsets")||"{}");}catch{return{};}});
  const [freeRecipeNames,setFreeRecipeNames]=useState(()=>{try{const a=JSON.parse(localStorage.getItem('otr_cfg_free')||'null');return a?new Set(a):new Set();}catch{return new Set();}});
  const [availPacks,setAvailPacks]=useState(()=>{try{return JSON.parse(localStorage.getItem('otr_cfg_packs')||'[]');}catch{return[];}});
  const [allPacks,setAllPacks]=useState(()=>{try{return JSON.parse(localStorage.getItem('otr_cfg_allpacks')||'[]');}catch{return[];}});
  const [unlockedPacks,setUnlockedPacks]=useState(()=>{try{return JSON.parse(localStorage.getItem('otr_unlocked')||'[]');}catch{return[];}});
  const [devMode,setDevMode]=useState(()=>localStorage.getItem('otr_devmode')==='1');
  const [groupPackIds,setGroupPackIds]=useState(()=>{try{return JSON.parse(localStorage.getItem('otr_group_packs')||'[]');}catch{return[];}});
  // receitas do Manager e flag de "carregado" partem do cache local: o app abre
  // instantâneo com o último snapshot e revalida com o Firestore em segundo plano
  const [managerRecipes,setManagerRecipes]=useState(()=>{try{return JSON.parse(localStorage.getItem('otr_cfg_mgr')||'[]');}catch{return[];}});
  const [packConfigLoaded,setPackConfigLoaded]=useState(()=>{try{return localStorage.getItem('otr_cfg_mgr')!==null;}catch{return false;}});
  const mainRef=useRef();
  const explorarScrollRef=useRef({pos:0,tab:"explorar"});
  const barScrollRef=useRef(0);
  const fsInitializedRef=useRef(false);

  // ── Carrega config de packs (receitas livres + packs à venda) ──
  // Chamada após cada mudança de auth (garante e-mail correto para grupos) e ao voltar ao 1º plano.
  // TTL: voltar ao 1º plano só re-busca após 5 min — evita re-baixar a coleção
  // managerRecipes inteira (custo Firestore + dados móveis) a cada alternância de app.
  const lastPackFetchRef=useRef(0);
  const refreshPackConfig=useCallback(async(force=false)=>{
    const now=Date.now();
    if(!force&&now-lastPackFetchRef.current<5*60*1000)return;
    lastPackFetchRef.current=now;
    let allPs=[];
    let freeNames=[];
    let gPackIds=[];
    let configOk=false;
    try{
      const [configSnap,packsSnap]=await Promise.all([
        getDoc(doc(db,"manager","config")),
        getDocs(collection(db,"packs"))
      ]);
      if(configSnap.exists()){
        const cfg=configSnap.data();
        freeNames=cfg.freeRecipes||[];
        setFreeRecipeNames(new Set(freeNames));
        const userEmail=auth.currentUser?.email||'';
        const ug=cfg.userGroups||{};
        let isInGroup=false;
        for(const gd of Object.values(ug)){
          if((gd.members||[]).some(m=>(m.email||m)===userEmail)){isInGroup=true;gPackIds=gd.packIds||[];break;}
        }
        setDevMode(isInGroup);
        setGroupPackIds(gPackIds);
        localStorage.setItem('otr_devmode',isInGroup?'1':'');
        localStorage.setItem('otr_group_packs',JSON.stringify(gPackIds));
        localStorage.setItem('otr_cfg_free',JSON.stringify(freeNames));
        configOk=true;
      }
      allPs=packsSnap.docs.map(d=>({id:d.id,...d.data()}));
      setAllPacks(allPs);
      localStorage.setItem('otr_cfg_allpacks',JSON.stringify(allPs));
      const ps=allPs.filter(p=>p.active&&p.showBanner!==false).sort((a,b)=>(a.order||0)-(b.order||0));
      setAvailPacks(ps);
      localStorage.setItem('otr_cfg_packs',JSON.stringify(ps));
    }catch(e){console.error(e);}
    finally{setPackConfigLoaded(true);}
    // se a config falhou, não carrega receitas do manager — evita exibir conteúdo
    // de packs pagos quando o gate de acesso (freeRecipes) não está disponível
    if(!configOk)return;
    try{
      const mgrSnap=await getDocs(collection(db,"managerRecipes"));
      const sysRecipeNames=new Set(allPs.filter(p=>p.system).flatMap(p=>p.recipeNames||[]));
      // receitas de packs liberados ao grupo do usuário (dev) — mesmo packs system,
      // como "Novas Receitas" — não devem ser tratadas como system-only e removidas
      const groupRecipeNames=new Set(allPs.filter(p=>gPackIds.includes(p.id)).flatMap(p=>p.recipeNames||[]));
      const nonSysRecipeNames=new Set([...freeNames,...allPs.filter(p=>!p.system).flatMap(p=>p.recipeNames||[]),...groupRecipeNames]);
      const sysOnlyNames=new Set([...sysRecipeNames].filter(n=>!nonSysRecipeNames.has(n)));
      const deletarNames=new Set(allPs.filter(p=>p.name?.toLowerCase().includes('deletar')||p.deletar===true).flatMap(p=>p.recipeNames||[]));
      const mRecipes=mgrSnap.docs.map(d=>({_docId:d.id,...d.data(),fromManager:true})).filter(r=>!sysOnlyNames.has(r.name)&&!deletarNames.has(r.name));
      setManagerRecipes(mRecipes);
      try{localStorage.setItem('otr_cfg_mgr',JSON.stringify(mRecipes));}catch{/* quota: segue só em memória */}
    }catch(e){console.error(e);}
  },[]);

  // ── Re-busca config quando app volta ao primeiro plano ──
  useEffect(()=>{
    const onVisible=()=>{ if(document.visibilityState==='visible') refreshPackConfig(); };
    document.addEventListener('visibilitychange',onVisible);
    return()=>document.removeEventListener('visibilitychange',onVisible);
  },[refreshPackConfig]);

  // ── Captura redirect do Google (mobile) ──
  useEffect(()=>{
    getRedirectResult(auth).catch(()=>{});
  },[]);

  // ── Trava orientação em portrait ──
  useEffect(()=>{
    const lock=async()=>{try{await screen.orientation?.lock?.('portrait');}catch{}};
    lock();
    window.addEventListener('orientationchange',lock);
    return()=>window.removeEventListener('orientationchange',lock);
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
      // recarrega a config de packs com o e-mail correto (grupos/dev mode)
      refreshPackConfig(true);
      if(u){
        setSyncing(true);
        try{
          const ref = doc(db,"users",u.uid);
          const snap = await getDoc(ref);
          if(snap.exists()){
            const d = snap.data();
            // registra o que veio do servidor para os effects de sync não
            // re-gravarem os mesmos dados logo após o login (writes-eco)
            const echo={};
            if(d.custom)         {setCustomRecipes(d.custom);   echo.custom=JSON.stringify(d.custom);}
            if(d.favs)           {setFavs(d.favs);              echo.favs=JSON.stringify(d.favs);}
            if(d.owned)          {setOwned(d.owned);            echo.owned=JSON.stringify(d.owned);}
            if(d.tried)          {setTried(d.tried);            echo.tried=JSON.stringify(d.tried);}
            if(d.spirits)        {setCustomSpirits(d.spirits);  echo.spirits=JSON.stringify(d.spirits);}
            if(d.overrides)      {setOverrides(d.overrides);    echo.overrides=JSON.stringify(d.overrides);}
            if(d.comanda)        {setComanda(d.comanda);        echo.comanda=JSON.stringify(d.comanda);}
            if(d.unlockedPacks)  {setUnlockedPacks(d.unlockedPacks);try{localStorage.setItem('otr_unlocked',JSON.stringify(d.unlockedPacks));}catch{}}
            serverEchoRef.current=echo;
          }
        }catch(e){console.error(e);}
        setSyncing(false);
      } else {
        // logout: zera packs desbloqueados e o cache, para não vazar entre contas
        setUnlockedPacks([]);
        try{localStorage.removeItem('otr_unlocked');}catch{}
      }
      fsInitializedRef.current = true;
    });
  },[refreshPackConfig]);

  // ── Sync to Firestore when data changes ──
  const serverEchoRef=useRef({});
  const syncToFirestore = useCallback(async (data) => {
    if(!auth.currentUser) return;
    if(!fsInitializedRef.current) return;
    // pula o write se o valor é exatamente o que acabou de chegar do servidor
    const [k,v]=Object.entries(data)[0];
    if(serverEchoRef.current[k]!==undefined){
      const same=serverEchoRef.current[k]===JSON.stringify(v);
      delete serverEchoRef.current[k];
      if(same) return;
    }
    try{ await setDoc(doc(db,"users",auth.currentUser.uid), data, {merge:true}); }
    catch(e){ console.error(e); }
  },[]);

  useEffect(()=>{try{localStorage.setItem("otr_custom",JSON.stringify(customRecipes));}catch{}; syncToFirestore({custom:customRecipes});},[customRecipes]);
  useEffect(()=>{try{localStorage.setItem("otr_favs",JSON.stringify(favs));}catch{}; syncToFirestore({favs});},[favs]);
  useEffect(()=>{try{localStorage.setItem("otr_comanda",JSON.stringify(comanda));}catch{}; syncToFirestore({comanda});},[comanda]);
  useEffect(()=>{try{localStorage.setItem('otr_comanda_groups',JSON.stringify(comandaGroups));}catch{};},[comandaGroups]);
  useEffect(()=>{try{localStorage.setItem("otr_owned",JSON.stringify(owned));}catch{}; syncToFirestore({owned});},[owned]);
  useEffect(()=>{try{localStorage.setItem("otr_tried",JSON.stringify(tried));}catch{}; syncToFirestore({tried});},[tried]);
  useEffect(()=>{try{localStorage.setItem("otr_spirits",JSON.stringify(customSpirits));}catch{}; syncToFirestore({spirits:customSpirits});},[customSpirits]);
  useEffect(()=>{try{localStorage.setItem("otr_overrides",JSON.stringify(overrides));}catch{}; syncToFirestore({overrides});},[overrides]);
  useEffect(()=>{try{localStorage.setItem("otr_bg_offsets",JSON.stringify(customBgOffsets));}catch{}},[customBgOffsets]);

  const allRecipes=useMemo(()=>{
    // Deduplica por nome (último prevalece = ID padrão, gerado após ID legado como _20th_century)
    const dedupedMgr=Object.values(managerRecipes.reduce((a,r)=>{a[r.name]=r;return a;},{}));
    // mgrNames inclui tombstones para excluir a versão de BASE_RECIPES correspondente
    const mgrNames=new Set(dedupedMgr.map(r=>r.name));
    const base=BASE_RECIPES
      .filter(r=>!mgrNames.has(r.name))
      .map(r=>overrides[r.name]?{...r,...overrides[r.name],_origName:r.name}:r)
      .filter(r=>!r.deleted);
    // activeMgr exclui tombstones (deleted:true) da lista visível
    const activeMgr=dedupedMgr.filter(r=>!r.deleted).map(r=>{const ov=overrides[r.name];if(!ov)return r;const patch={};if(ov.rating!==undefined)patch.rating=ov.rating;if(ov.notes!==undefined)patch.notes=ov.notes;return Object.keys(patch).length?{...r,...patch}:r;});
    const normalize=r=>({...r,
      categories:Array.isArray(r.categories)?r.categories:[],
      ingredients:Array.isArray(r.ingredients)?r.ingredients:[],
      steps:Array.isArray(r.steps)?r.steps:[],
      notes:r.notes||"",
    });
    return [...base,...activeMgr,...customRecipes].map(normalize);
  },[customRecipes,overrides,managerRecipes]);

  // receitas que o usuário pode acessar (livres + packs desbloqueados + autorais)
  const accessibleRecipes=useMemo(()=>{
    if(!packConfigLoaded)return[];
    return allRecipes.filter(r=>{
      if(!r.custom){
        if(devMode){const inFree=freeRecipeNames.has(r.name);const inGroup=allPacks.some(p=>groupPackIds.includes(p.id)&&(p.recipeNames||[]).includes(r.name));if(!inFree&&!inGroup)return false;}
        else if(freeRecipeNames.size>0){const inFree=freeRecipeNames.has(r.name);const inUnlocked=availPacks.some(p=>unlockedPacks.includes(p.id)&&(p.recipeNames||[]).includes(r.name));if(!inFree&&!inUnlocked)return false;}
      }
      return true;
    });
  },[allRecipes,devMode,groupPackIds,freeRecipeNames,availPacks,allPacks,unlockedPacks,packConfigLoaded]);

  const drinkRecipes=useMemo(()=>accessibleRecipes.filter(r=>!r.categories.includes("Preparos Caseiros")),[accessibleRecipes]);

  const deepLinkNameRef=useRef(new URLSearchParams(window.location.search).get("r"));
  useEffect(()=>{
    if(!deepLinkNameRef.current||!accessibleRecipes.length)return;
    const name=decodeURIComponent(deepLinkNameRef.current);
    deepLinkNameRef.current=null;
    const recipe=accessibleRecipes.find(r=>r.name===name);
    if(recipe){window.history.replaceState({},"","/");setOpen(recipe);}
  },[accessibleRecipes]);

  // ── UI persistida entre sessões: última aba, ordenação e filtros do Explorar ──
  const ui0=useRef(null);
  if(ui0.current===null){try{ui0.current=JSON.parse(localStorage.getItem("otr_ui")||"{}");}catch{ui0.current={};}}
  const savedUI=ui0.current;

  const [activeStyle,setActiveStyle]=useState(savedUI.style??null);
  const [activeSpirits,setActiveSpirits]=useState(Array.isArray(savedUI.spirits)?savedUI.spirits:[]);
  const [search,setSearch]=useState("");
  const [spiritSearch,setSpiritSearch]=useState("");
  const [open,setOpen]=useState(null);
  useEffect(()=>{
    if(!open){
      const pos=explorarScrollRef.current.pos;
      requestAnimationFrame(()=>{if(mainRef.current)mainRef.current.scrollTop=pos;});
    }
  },[open]);
  const [editing,setEditing]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [sharedFiles,setSharedFiles]=useState(null);

  // ── Web Share Target: o SW grava as imagens compartilhadas no cache e
  // redireciona para /?share=pending — aqui recuperamos e abrimos o form ──
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get("share")==="pending"){
      window.history.replaceState({},"","/");
      (async()=>{
        try{
          const cache=await caches.open("otr-share-target");
          const countRes=await cache.match("/shared-count");
          if(!countRes)return;
          const count=parseInt(await countRes.text());
          const files=await Promise.all(Array.from({length:count},async(_,i)=>{
            const res=await cache.match(`/shared-image-${i}`);
            if(!res)return null;
            const blob=await res.blob();
            const type=res.headers.get("Content-Type")||"image/jpeg";
            return new File([blob],`shared-${i}.jpg`,{type});
          }));
          await cache.delete("/shared-count");
          for(let i=0;i<count;i++)await cache.delete(`/shared-image-${i}`);
          const valid=files.filter(Boolean);
          if(valid.length>0){setSharedFiles(valid);setShowForm(true);}
        }catch(e){console.error("share retrieve error",e);}
      })();
    }
  },[]);
  const [sort,setSort]=useState(savedUI.sort??"nome");
  // filterMode (Minhas Receitas/Favoritas/Provadas/etc) NÃO persiste entre
  // sessões: é um recorte contextual — restaurá-lo deixava o Explorar abrindo
  // "grudado" num filtro do Perfil sem o contexto de sub-tela
  const [filterMode,setFilterMode]=useState("tudo");
  const [filterAnd,setFilterAnd]=useState(!!savedUI.and);
  const [activeOccasions,setActiveOccasions]=useState(Array.isArray(savedUI.occasions)?savedUI.occasions:[]);
  // activePack NÃO é restaurado entre sessões: depende do acesso (grupo/packs
  // desbloqueados) que carrega de forma assíncrona — restaurá-lo cedo deixava a
  // lista vazia ("436 receitas / nenhuma encontrada") até o acesso chegar
  const [activePack,setActivePack]=useState(null);
  const [sidebarTab,setSidebarTab]=useState("família");
  const [mobileTab,setMobileTab]=useState(savedUI.tab??"descobrir");
  const prevTabRef=useRef("descobrir");
  useEffect(()=>{
    if(mobileTab==="ingredientes"){
      const pos=barScrollRef.current;
      requestAnimationFrame(()=>{window.scrollTo(0,pos);});
    }
  },[mobileTab]);
  // persiste a UI (aba, ordenação e filtros) para reabrir onde o usuário parou
  useEffect(()=>{
    try{localStorage.setItem("otr_ui",JSON.stringify({tab:mobileTab,sort,style:activeStyle,spirits:activeSpirits,occasions:activeOccasions,and:filterAnd}));}catch{}
  },[mobileTab,sort,activeStyle,activeSpirits,activeOccasions,filterMode,filterAnd]);
  const [filterSheet,setFilterSheet]=useState(null);
  const importRef=useRef();
  const [confirmDialog,setConfirmDialog]=useState(null);
  const showConfirm=useCallback((message,onConfirm,danger=false)=>setConfirmDialog({message,onConfirm,danger}),[]);
  const closeConfirm=useCallback(()=>setConfirmDialog(null),[]);

  // ── Persiste fotos personalizadas e avisa quando o armazenamento estourar ──
  const bgQuotaWarnedRef=useRef(false);
  useEffect(()=>{
    try{localStorage.setItem("otr_custom_bgs",JSON.stringify(customBgs));}
    catch{
      if(!bgQuotaWarnedRef.current){
        bgQuotaWarnedRef.current=true;
        showConfirm("Não foi possível salvar suas fotos personalizadas — o armazenamento do navegador está cheio. Remova algumas fotos de receitas para liberar espaço, ou elas serão perdidas ao fechar o app.",null,false);
      }
    }
  },[customBgs,showConfirm]);

  // ── Mantém a tela acesa apenas enquanto uma receita está aberta ──
  const recipeOpen=!!open;
  useEffect(()=>{
    if(!recipeOpen||!("wakeLock" in navigator))return;
    let lock=null;
    const request=async()=>{try{lock=await navigator.wakeLock.request("screen");}catch{}};
    const onVisible=()=>{if(document.visibilityState==="visible")request();};
    document.addEventListener("visibilitychange",onVisible);
    request();
    return()=>{document.removeEventListener("visibilitychange",onVisible);lock?.release();};
  },[recipeOpen]);

  const [swipeHistory,setSwipeHistory]=useState([]);
  const [swipeHistIdx,setSwipeHistIdx]=useState(0);
  const [swipeUnprovenOnly,setSwipeUnprovenOnly]=useState(()=>localStorage.getItem("otr_swipe_unproven")==="1");
  const [recipeProfiles,setRecipeProfiles]=useState({});

  // badge e filtro por pack: incluem packs system QUANDO liberados ao grupo dev
  // (accessibleIds nunca contém packs system para usuários comuns — só compras)
  const recipePackMap=useMemo(()=>{
    const m={};
    const accessibleIds=devMode?new Set(groupPackIds):new Set(unlockedPacks);
    for(const pk of allPacks){if(accessibleIds.has(pk.id)){for(const n of(pk.recipeNames||[])){m[n]=pk.name;}}}
    return m;
  },[allPacks,devMode,groupPackIds,unlockedPacks]);
  const accessiblePacks=useMemo(()=>{
    if(devMode) return allPacks.filter(pk=>groupPackIds.includes(pk.id));
    return allPacks.filter(pk=>unlockedPacks.includes(pk.id));
  },[devMode,allPacks,groupPackIds,unlockedPacks]);
  // nomes das receitas do pack filtrado — uma receita pode estar em vários packs
  // (multipack), então o filtro checa pertencimento ao pack, não um único mapa 1:1
  const activePackNames=useMemo(()=>{
    if(!activePack)return null;
    const pk=accessiblePacks.find(p=>p.name===activePack);
    return new Set(pk?.recipeNames||[]);
  },[activePack,accessiblePacks]);
  const packSpirits=useMemo(()=>accessiblePacks.flatMap(pk=>pk.spirits||[]),[accessiblePacks]);
  const allSpirits=useMemo(()=>[...new Set([...allRecipes.flatMap(r=>r.categories.filter(c=>SPIRIT_CATS.has(c))),...packSpirits,...customSpirits])].sort(),[allRecipes,packSpirits,customSpirits]);
  const spiritCatsAll=useMemo(()=>new Set([...SPIRIT_CATS,...packSpirits,...customSpirits]),[packSpirits,customSpirits]);
  const visibleSpirits=useMemo(()=>allSpirits.filter(s=>s.toLowerCase().includes(spiritSearch.toLowerCase())),[allSpirits,spiritSearch]);

  const [ratingPopup,setRatingPopup]=useState(null);

  const haptic=()=>{try{navigator.vibrate&&navigator.vibrate(100);}catch{}};
  const toggleFav=n=>{haptic();setFavs(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);};
  const toggleComanda=n=>{
    haptic();
    if(comanda.includes(n)){
      setComanda(p=>p.filter(x=>x!==n));
      setComandaGroups(p=>p.map(g=>({...g,drinks:g.drinks.filter(d=>d!==n)})));
    } else {
      setComanda(p=>[...p,n]);
    }
  };
  const moveDrinkInGroup=(name,dir)=>setComandaGroups(p=>p.map(g=>{const i=g.drinks.indexOf(name);if(i<0)return g;const j=i+dir;if(j<0||j>=g.drinks.length)return g;const a=[...g.drinks];[a[i],a[j]]=[a[j],a[i]];return{...g,drinks:a};}));
  // reordena respeitando o contexto visível: dentro do grupo, ou entre os "sem grupo"
  const moveInComanda=(name,dir)=>{
    const grp=comandaGroups.find(g=>g.drinks.includes(name));
    if(grp){moveDrinkInGroup(name,dir);return;}
    const groupedNames=new Set(comandaGroups.flatMap(g=>g.drinks));
    setComanda(prev=>{
      const ung=prev.filter(n=>!groupedNames.has(n));
      const i=ung.indexOf(name);const j=i+dir;
      if(i<0||j<0||j>=ung.length)return prev;
      const other=ung[j];
      const arr=[...prev];
      const ia=arr.indexOf(name),ib=arr.indexOf(other);
      [arr[ia],arr[ib]]=[arr[ib],arr[ia]];
      return arr;
    });
  };
  const addComandaGroup=name=>{const id=Math.random().toString(36).slice(2,8);setComandaGroups(p=>[...p,{id,name,collapsed:false,drinks:[]}]);};
  const deleteComandaGroup=id=>setComandaGroups(p=>p.filter(g=>g.id!==id));
  const toggleGroupCollapse=id=>setComandaGroups(p=>p.map(g=>g.id===id?{...g,collapsed:!g.collapsed}:g));
  const renameGroup=(id,name)=>{if(name.trim())setComandaGroups(p=>p.map(g=>g.id===id?{...g,name:name.trim()}:g));};
  const moveDrinkToGroup=(name,groupId)=>setComandaGroups(p=>p.map(g=>({...g,drinks:g.id===groupId?[...g.drinks.filter(n=>n!==name),name]:g.drinks.filter(n=>n!==name)})));
  const moveDrinkToUngrouped=name=>setComandaGroups(p=>p.map(g=>({...g,drinks:g.drinks.filter(n=>n!==name)})));
  const startLongPress=name=>{clearTimeout(pressTimerRef.current);pressTimerRef.current=setTimeout(()=>{haptic();setComandaLongPress(name);},500);};
  const cancelLongPress=()=>clearTimeout(pressTimerRef.current);
  const toggleOwned=s=>setOwned(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const toggleTried=n=>setTried(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);
  const handleTried=useCallback(name=>{
    const alreadyTried=tried.includes(name);
    setTried(p=>alreadyTried?p.filter(x=>x!==name):[...p,name]);
    if(!alreadyTried){
      const recipe=allRecipes.find(r=>r.name===name);
      if(recipe&&recipe.rating===0) setRatingPopup(recipe);
    }
  },[tried,allRecipes]);
  const toggleSpirit=s=>setActiveSpirits(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const toggleOccasion=t=>setActiveOccasions(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
  const clearAll=()=>{setActiveStyle(null);setActiveSpirits([]);setSearch("");setFilterMode("tudo");setActiveOccasions([]);setActivePack(null);};
  const hasFilters=!!(activeStyle||activeSpirits.length>0||search||filterMode!=="tudo"||activeOccasions.length>0||activePack);

  // ── Sub-tela do Perfil: atalhos (favoritos/provados/minhas) abrem a lista
  // filtrada mantendo "Perfil" como contexto (nav destacada + voltar ao perfil) ──
  const [profileView,setProfileView]=useState(false);
  const preProfileRef=useRef(null);
  const openProfileList=f=>{
    preProfileRef.current={filterMode,activeStyle,activeSpirits,activeOccasions,activePack,search};
    setActiveStyle(null);setActiveSpirits([]);setActiveOccasions([]);setActivePack(null);setSearch("");
    setFilterMode(["naoprovei","favs","custom","tenho","provados","tudo"].includes(f)?f:"tudo");
    setMobileTab("explorar");setProfileView(true);
  };
  const exitProfileView=()=>{
    setProfileView(false);
    const p=preProfileRef.current;
    if(p){setFilterMode(p.filterMode);setActiveStyle(p.activeStyle);setActiveSpirits(p.activeSpirits);setActiveOccasions(p.activeOccasions);setActivePack(p.activePack);setSearch(p.search);preProfileRef.current=null;}
  };
  const backToProfile=()=>{exitProfileView();setMobileTab("perfil");window.scrollTo(0,0);};

  // ── Back button — navega dentro do app ──
  const backRef=useRef({});
  const searchInputRef=useRef(null);
  const peekNextRef=useRef(null);
  const peekPrevRef=useRef(null);
  const handleDragChange=useCallback(({nextPct,prevPct})=>{
    if(peekNextRef.current){
      peekNextRef.current.style.opacity=String(0.22+nextPct*0.78);
      peekNextRef.current.style.transform=`translateX(${52*(1-nextPct)}px)`;
    }
    if(peekPrevRef.current){
      peekPrevRef.current.style.opacity=String(0.22+prevPct*0.78);
      peekPrevRef.current.style.transform=`translateX(${-52*(1-prevPct)}px)`;
    }
  },[]);
  backRef.current={open,showForm,editing,mobileTab,activeStyle,activeSpirits,search,filterMode,activeOccasions,activePack,profileView};
  useEffect(()=>{
    const push=()=>window.history.pushState({otr:true},"");
    push();
    const onPop=()=>{
      const s=backRef.current;
      if(s.open){setOpen(null);push();return;}
      if(s.showForm||s.editing){setShowForm(false);setEditing(null);push();return;}
      if(s.profileView){backToProfile();push();return;}
      if(s.mobileTab!=="descobrir"){const prev=prevTabRef.current;prevTabRef.current=s.mobileTab;setMobileTab(prev!==s.mobileTab?prev:"descobrir");push();return;}
      if(s.activeStyle||s.activeSpirits.length||s.search||s.filterMode!=="tudo"||s.activeOccasions.length||s.activePack){
        setActiveStyle(null);setActiveSpirits([]);setSearch("");setFilterMode("tudo");setActiveOccasions([]);setActivePack(null);push();return;
      }
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  const hasAllIngredients=useCallback(recipe=>{
    const spirits=recipe.categories.filter(c=>SPIRIT_CATS.has(c)||customSpirits.includes(c)||packSpirits.includes(c));
    return spirits.length>0&&spirits.every(s=>owned.includes(s));
  },[owned,customSpirits,packSpirits]);

  const surpriseMe=useCallback(()=>{
    // sorteia apenas entre receitas acessíveis (não inclui packs bloqueados)
    const pool=drinkRecipes.filter(r=>!tried.includes(r.name));
    if(!pool.length)return;
    setOpen(pool[Math.floor(Math.random()*pool.length)]);
  },[drinkRecipes,tried]);

  const saveRecipe=useCallback(recipe=>{
    const {originalName,...rest}=recipe;
    if(!rest.custom){
      // receita base: salva como override chaveado pelo nome ORIGINAL,
      // para a edição (inclusive renomear) ser aplicada corretamente
      const {name,...fields}=rest;
      const key=originalName||name;
      setOverrides(p=>({...p,[key]:{...(p[key]||{}),...fields,name,adjusted:true}}));
    } else {
      setCustomRecipes(p=>{const idx=p.findIndex(r=>r.id===rest.id);if(idx>=0){const n=[...p];n[idx]=rest;return n;}return[...p,rest];});
    }
    setShowForm(false);setEditing(null);
  },[]);

  const deleteRecipe=useCallback(recipe=>{setCustomRecipes(p=>p.filter(r=>r.id!==recipe.id));setOpen(null);},[]);
  const deleteBaseRecipe=useCallback(recipe=>{const k=ovKey(recipe);setOverrides(p=>({...p,[k]:{...(p[k]||{}),deleted:true}}));setOpen(null);},[]);
  const repoRecipe=useCallback(name=>{setOverrides(p=>{const n={...p};delete n[name];return n;});setOpen(null);},[]);
  const restoreAll=useCallback(()=>{setOverrides({});setCustomRecipes([]);setFavs([]);setTried([]);setComanda([]);},[]);
  const restoreRecipes=useCallback(()=>setOverrides({}),[]);

  const noteRecipe=useCallback((recipe,notes)=>{
    if(recipe.custom){setCustomRecipes(p=>p.map(r=>r.name===recipe.name?{...r,notes}:r));}
    else{const k=ovKey(recipe);setOverrides(p=>({...p,[k]:{...(p[k]||{}),notes}}));}
  },[]);

  const rateRecipe=useCallback((recipe,rating)=>{
    if(recipe.custom){setCustomRecipes(p=>p.map(r=>r.name===recipe.name?{...r,rating}:r));}
    else{const k=ovKey(recipe);setOverrides(p=>({...p,[k]:{...(p[k]||{}),rating}}));}
    setOpen(prev=>prev?{...prev,rating}:prev);
  },[]);

  const exportJSON=()=>{
    // backup completo: receitas autorais, favoritos, provados, bar, comanda, ajustes e bebidas custom
    const data=JSON.stringify({custom:customRecipes,favs,tried,owned,comanda,comandaGroups,overrides,spirits:customSpirits},null,2);
    const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download=`ontherocks_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  const importJSON=e=>{
    const file=e.target.files?.[0];if(!file)return;
    e.target.value="";
    const doImport=()=>{
      const r=new FileReader();
      r.onload=ev=>{
        try{
          const d=JSON.parse(ev.target.result);
          const strArr=x=>Array.isArray(x)?x.filter(s=>typeof s==="string"):null;
          if(Array.isArray(d.custom))setCustomRecipes(d.custom.filter(x=>x&&typeof x.name==="string"));
          const favsArr=strArr(d.favs);if(favsArr)setFavs(favsArr);
          const triedArr=strArr(d.tried);if(triedArr)setTried(triedArr);
          const ownedArr=strArr(d.owned);if(ownedArr)setOwned(ownedArr);
          const comandaArr=strArr(d.comanda);if(comandaArr)setComanda(comandaArr);
          if(Array.isArray(d.comandaGroups))setComandaGroups(d.comandaGroups.filter(g=>g&&typeof g.name==="string"&&Array.isArray(g.drinks)));
          if(d.overrides&&typeof d.overrides==="object"&&!Array.isArray(d.overrides))setOverrides(d.overrides);
          const spiritsArr=strArr(d.spirits);if(spiritsArr)setCustomSpirits(spiritsArr);
        }catch{showConfirm("Arquivo inválido ou corrompido.",null,false);}
      };
      r.readAsText(file);
    };
    showConfirm("Importar substitui suas receitas, favoritas, avaliações e demais dados pelos do backup. Continuar?",doImport,true);
  };

  // filtro efetivo para mobile favoritos
  const effectiveFilterMode = filterMode;

  const filtered=useMemo(()=>{
    if(!packConfigLoaded)return[];
    let list=allRecipes.filter(r=>{
      if(!r.custom){
        if(devMode){const inFree=freeRecipeNames.has(r.name);const inGroup=allPacks.some(p=>groupPackIds.includes(p.id)&&(p.recipeNames||[]).includes(r.name));if(!inFree&&!inGroup)return false;}
        else if(freeRecipeNames.size>0){const inFree=freeRecipeNames.has(r.name);const inUnlocked=availPacks.some(p=>unlockedPacks.includes(p.id)&&(p.recipeNames||[]).includes(r.name));if(!inFree&&!inUnlocked)return false;}
      }
    // esconde Preparos Caseiros da navegação geral — exceto ao buscar, ao abrir a
    // família "Preparos Caseiros" ou ao filtrar por um pack (que pode contê-los)
    if(!search&&!activePack&&activeStyle!=="Preparos Caseiros"&&r.categories.includes("Preparos Caseiros"))return false;
      if(effectiveFilterMode==="favs"&&!favs.includes(r.name))return false;
      if(effectiveFilterMode==="tenho"&&!hasAllIngredients(r))return false;
      if(effectiveFilterMode==="custom"&&!r.custom)return false;
      if(effectiveFilterMode==="naoprovei"&&tried.includes(r.name))return false;
      if(effectiveFilterMode==="provados"&&!tried.includes(r.name))return false;
      if(activeStyle&&!r.categories.includes(activeStyle))return false;
      if(activeSpirits.length>0&&!(filterAnd?activeSpirits.every(s=>r.categories.includes(s)):activeSpirits.some(s=>r.categories.includes(s))))return false;
      if(activeOccasions.length>0&&!activeOccasions.some(t=>(OCCASION_TAGS[r.name]||[]).includes(t)))return false;
      if(activePack&&!(activePackNames&&activePackNames.has(r.name)))return false;
      if(search){const words=norm(search).split(/\s+/).filter(Boolean);const hay=norm(r.name)+" "+(r.ingredients||[]).map(norm).join(" ")+" "+(r.categories||[]).map(norm).join(" ")+" "+norm(r.notes);return words.every(w=>hay.includes(w));}
      return true;
    });
    if(sort==="rating")list=[...list].filter(r=>r.rating>0).sort((a,b)=>b.rating-a.rating);
    else if(sort==="ingredientes")list=[...list].sort((a,b)=>a.ingredients.length-b.ingredients.length);
    else if(sort==="recentes")list=[...list].sort((a,b)=>(b.id||0)-(a.id||0));
    else list=[...list].sort((a,b)=>a.name.localeCompare(b.name,"pt"));
    return list;
  },[allRecipes,activeStyle,activeSpirits,activeOccasions,activePack,activePackNames,search,favs,owned,tried,sort,effectiveFilterMode,hasAllIngredients,filterAnd,freeRecipeNames,availPacks,allPacks,unlockedPacks,devMode,groupPackIds,packConfigLoaded]);

  // swipe filtrado: quando há filtro ativo usa a lista filtrada em ordem
  // ao filtrar por um pack, o deck mostra tudo do pack (inclusive preparos);
  // nos demais filtros os preparos seguem fora do swipe
  const swipeFiltered=useMemo(()=>hasFilters?filtered.filter(r=>activePack||!r.categories.includes("Preparos Caseiros")):null,[hasFilters,filtered,activePack]);

  const swipePool=useMemo(()=>swipeUnprovenOnly?drinkRecipes.filter(r=>!tried.includes(r.name)):drinkRecipes,[drinkRecipes,swipeUnprovenOnly,tried]);

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
    const pool=swipePool.filter(r=>r.name!==currentRecipe?.name&&r.categories.find(c=>STYLE_CATS.has(c))!==currentFamily);
    const src=pool.length?pool:swipePool.filter(r=>r.name!==currentRecipe?.name);
    if(!src.length)return currentRecipe;
    return src[Math.floor(Math.random()*src.length)];
  },[swipePool]);

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

  // Pré-popula o próximo item no histórico para que peek e navegação mostrem o mesmo card
  useEffect(()=>{
    if(swipeFiltered||!swipeRecipe||!swipePool.length)return;
    if(swipeHistIdx>=swipeHistory.length-1){
      const next=pickDifferentFamily(swipeRecipe);
      if(next)setSwipeHistory(h=>[...h,next.name]);
    }
  },[swipeRecipe?.name,swipeHistIdx,swipeFiltered]);// eslint-disable-line

  const prevPeekRecipe=useMemo(()=>{
    if(swipeHistIdx>0){
      if(swipeFiltered)return swipeFiltered[swipeHistIdx-1]||null;
      const name=swipeHistory[swipeHistIdx-1];
      return drinkRecipes.find(r=>r.name===name)||null;
    }
    // sem histórico — mostra card decorativo para sensação de profundidade
    if(!swipeRecipe||!swipePool.length)return null;
    const pool=swipePool.filter(r=>r.name!==swipeRecipe.name);
    if(!pool.length)return null;
    const seed=swipeRecipe.name.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
    return pool[(seed+3)%pool.length];
  },[swipeHistIdx,swipeHistory,drinkRecipes,swipeFiltered,swipeRecipe,swipePool]);

  const nextPeekRecipe=useMemo(()=>{
    if(swipeFiltered)return swipeFiltered[swipeHistIdx+1]||null;
    if(!swipeHistory.length||!drinkRecipes.length)return null;
    const name=swipeHistory[swipeHistIdx+1];
    if(!name)return null;
    return drinkRecipes.find(r=>r.name===name)||null;
  },[swipeFiltered,swipeHistIdx,swipeHistory,drinkRecipes]);

  // ── background preload ──
  const preloadedBgs=useRef(new Set());
  useEffect(()=>{
    if(!swipeRecipe)return;
    const urls=new Set();
    const addBg=r=>{if(!r)return;const mood=r.moodOverride||r.mood||RECIPE_MOODS[r.name]||getMood(r);urls.add(CARD_BG_FILES[mood]||CARD_BG_FILES.frost_tide);};
    if(swipeFiltered){
      for(let i=swipeHistIdx+1;i<Math.min(swipeHistIdx+9,swipeFiltered.length);i++)addBg(swipeFiltered[i]);
    } else {
      for(let i=swipeHistIdx+1;i<Math.min(swipeHistIdx+4,swipeHistory.length);i++){
        const r=drinkRecipes.find(r=>r.name===swipeHistory[i]);addBg(r);
      }
      let prev=swipeRecipe;
      for(let i=0;i<7;i++){
        const pool=swipePool.filter(r=>r.name!==prev?.name);
        if(!pool.length)break;
        const fam=prev?.categories.find(c=>STYLE_CATS.has(c));
        const src=pool.filter(r=>r.categories.find(c=>STYLE_CATS.has(c))!==fam);
        const candidates=src.length?src:pool;
        const seed=(prev?.name||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0);
        prev=candidates[(seed+i*13)%candidates.length];
        addBg(prev);
      }
    }
    urls.forEach(url=>{
      if(preloadedBgs.current.has(url))return;
      preloadedBgs.current.add(url);
      const img=new Image();img.src=url;
    });
  },[swipeRecipe?.name,swipeHistIdx]);// eslint-disable-line
  // Reseta peek cards ao trocar de recipe
  useEffect(()=>{
    if(peekNextRef.current){ peekNextRef.current.style.opacity="0.22"; peekNextRef.current.style.transform="translateX(52px)"; }
    if(peekPrevRef.current){ peekPrevRef.current.style.opacity="0.22"; peekPrevRef.current.style.transform="translateX(-52px)"; }
  },[swipeRecipe?.name]);// eslint-disable-line


  // ── profile generation ──
  const profileLoadingRef=useRef(new Set());
  const loadProfile=useCallback(async(recipe)=>{
    if(!recipe)return;
    const name=recipe.name;
    if(profileLoadingRef.current.has(name))return;
    // receitas base: perfil já embutido
    if(RECIPE_PROFILES[name]){setRecipeProfiles(prev=>({...prev,[name]:RECIPE_PROFILES[name]}));return;}
    const cacheKey="otr_prof_"+name;
    const cached=localStorage.getItem(cacheKey);
    if(cached){try{const p=JSON.parse(cached);setRecipeProfiles(prev=>({...prev,[name]:p}));return;}catch{}}
    profileLoadingRef.current.add(name);
    try{
      const res=await fetch("/api/anthropic",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001",max_tokens:280,
          system:"Sommelier de coquetéis. Responda APENAS com JSON válido, sem texto adicional.",
          messages:[{role:"user",content:`Drink: "${name}"\nIngredientes: ${recipe.ingredients.slice(0,6).join(", ")}\n\nGere perfil em português:\n{"flavors":"ADJ • ADJ • ADJ","perfil":"UmaPalavra","perfil_desc":"frase curta sensorial (2-3 palavras)","sensacao":"UmaPalavra","sensacao_desc":"frase curta sensorial (2-3 palavras)","ocasiao":"UmaPalavraCurta","ocasiao_desc":"frase curta de contexto (2-3 palavras)"}`}]
        })
      });
      const data=await res.json();
      const text=(data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim();
      const prof=JSON.parse(text);
      localStorage.setItem(cacheKey,JSON.stringify(prof));
      setRecipeProfiles(prev=>({...prev,[name]:prof}));
    }catch{
      // fail silently
    }finally{
      profileLoadingRef.current.delete(name);
    }
  },[]);

  useEffect(()=>{if(swipeRecipe)loadProfile(swipeRecipe);},[swipeRecipe?.name,loadProfile]);
  useEffect(()=>{
    if(nextPeekRecipe)loadProfile(nextPeekRecipe);
    if(prevPeekRecipe)loadProfile(prevPeekRecipe);
  },[nextPeekRecipe?.name,prevPeekRecipe?.name,loadProfile]);// eslint-disable-line
  useEffect(()=>{if(open)loadProfile(open);},[open?.name,loadProfile]);

  // reset idx ao mudar filtros
  useEffect(()=>{setSwipeHistIdx(0);},[activeStyle,activeSpirits,activeOccasions,filterMode,search]);

  useEffect(()=>{
    if(mobileTab==="descobrir"){
      document.documentElement.style.overflow="hidden";
      window.scrollTo(0,0);
      setActiveOccasions([]);
      setFilterSheet(null);
    } else {
      document.documentElement.style.overflow="";
    }
    return()=>{document.documentElement.style.overflow="";};
  },[mobileTab]);

  const sidebarProps={sidebarTab,setSidebarTab,allRecipes,activeStyle,setActiveStyle,allSpirits,visibleSpirits,owned,toggleOwned,filterMode,setFilterMode,activeSpirits,toggleSpirit,activeOccasions,toggleOccasion,spiritSearch,setSpiritSearch,hasFilters,clearAll,customSpirits,setCustomSpirits,setMobileTab};

  return(
    <div style={{fontFamily:"Archivo,sans-serif",minHeight:"100vh",background:"#070707",color:"#F0EBE1",overflowX:"hidden"}}>
      <style>{`
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
        @media(min-width:701px){
          .disc-stage{left:240px!important}
          .disc-card{max-width:400px!important}
          .disc-actions{left:calc(50% - 250px)!important;right:calc(50% - 250px)!important}
          .disc-controls{max-width:560px!important}
        }
      `}</style>
      <input ref={importRef} type="file" accept=".json" onChange={importJSON} style={{display:"none"}}/>

      {/* ── HEADER ── */}
      <header style={{padding:"14px 22px 12px",borderBottom:"1px solid rgba(240,235,225,0.05)",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",background:"#070707",position:"sticky",top:0,zIndex:200}}>
        <button onClick={()=>{setProfileView(false);preProfileRef.current=null;setMobileTab("descobrir");setActiveStyle(null);setActiveSpirits([]);setFilterMode("tudo");setSearch("");}} style={{marginRight:"auto",lineHeight:1,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <div style={{height:1,width:18,background:"rgba(240,235,225,0.2)"}}/>
            <span style={{fontSize:9,letterSpacing:5,textTransform:"uppercase",color:"rgba(240,235,225,0.58)",fontWeight:300}}>ON THE</span>
            <div style={{height:1,width:18,background:"rgba(240,235,225,0.2)"}}/>
          </div>
          <span style={{fontSize:28,letterSpacing:4,textTransform:"uppercase",fontWeight:900,display:"block",lineHeight:1,color:"#F0EBE1"}}>ROCKS</span>
          <span style={{fontSize:7,letterSpacing:4,textTransform:"uppercase",color:"rgba(160,120,90,0.7)",display:"block",marginTop:3,fontWeight:400}}>COCKTAIL RECIPES</span>
        </button>

        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:4}}>
          <div style={{display:"flex",flexDirection:"column",gap:1,alignItems:"flex-end"}}>
            <button onClick={()=>{setFilterMode("tudo");setActiveStyle(null);setActiveSpirits([]);setSearch("");setMobileTab("explorar");}} style={{background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"right",fontFamily:"Archivo,sans-serif"}}>
              <span style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.38)",fontWeight:500}}>{packConfigLoaded?`${drinkRecipes.length} receitas`:"—"}</span>
            </button>
            <button onClick={()=>{setFilterMode(filterMode==="provados"?"tudo":"provados");setMobileTab("explorar");}} style={{background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"right",fontFamily:"Archivo,sans-serif"}}>
              <span style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(74,222,128,0.6)",fontWeight:500}}>{tried.length} provadas</span>
            </button>
            <button onClick={()=>{setFilterMode(filterMode==="favs"?"tudo":"favs");setMobileTab("explorar");}} style={{background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"right",fontFamily:"Archivo,sans-serif"}}>
              <span style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(200,169,110,0.5)",fontWeight:500}}>{favs.length} favoritas</span>
            </button>
          </div>
          {/* botão adicionar receita — ao lado dos contadores */}
          <button onClick={()=>setShowForm(true)}
            style={{width:36,height:36,borderRadius:6,flexShrink:0,
              background:"rgba(100,72,38,0.12)",border:"1px solid rgba(180,140,80,0.22)",
              color:"rgba(210,170,100,0.7)",fontSize:20,fontWeight:300,lineHeight:1,
              boxShadow:"0 0 14px rgba(140,100,50,0.22), inset 0 1px 0 rgba(255,255,255,0.05)",
              cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              backdropFilter:"blur(8px)"}}>
            +
          </button>
        </div>

        <div className="hdr-filters" style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[["tudo","Todas"],["favs",`Favoritas${favs.length?` ${favs.length}`:""}`],["naoprovei","Não provei"],["tenho","O que tenho"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilterMode(v)} style={{padding:"5px 11px",borderRadius:3,fontSize:10,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,background:filterMode===v?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${filterMode===v?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.08)"}`,color:filterMode===v?"#A0785A":"rgba(240,235,225,0.3)",transition:"all .15s"}}>{l}</button>
          ))}
        </div>

        <input className="hdr-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="buscar drink, ingrediente ou técnica…" style={{background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.15)",borderRadius:3,padding:"7px 12px",color:"#F0EBE1",fontSize:12,width:220}} onFocus={e=>e.target.style.borderColor="rgba(160,120,90,0.35)"} onBlur={e=>e.target.style.borderColor="rgba(240,235,225,0.08)"}/>

        <div className="hdr-actions" style={{display:"flex",gap:6}}>
          <button onClick={surpriseMe} style={{padding:"7px 12px",borderRadius:3,background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.3)",color:"#A78BFA",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>✦ Surpreenda-me</button>
          <button onClick={()=>setShowForm(true)} style={{padding:"7px 14px",borderRadius:3,background:"rgba(160,120,90,0.15)",border:"1px solid rgba(160,120,90,0.5)",color:"#A0785A",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>+ Receita</button>
          <button onClick={exportJSON} title="Exportar" style={{padding:"7px 10px",borderRadius:3,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.13)",color:"rgba(240,235,225,0.52)",fontSize:13}}>↓</button>
          <button onClick={()=>importRef.current?.click()} title="Importar" style={{padding:"7px 10px",borderRadius:3,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.13)",color:"rgba(240,235,225,0.52)",fontSize:13}}>↑</button>
        </div>
      </header>

      {/* ── LAYOUT ── */}
      <div className="lay" style={{display:"grid",gridTemplateColumns:"240px 1fr",minHeight:"calc(100vh - 70px)"}}>
        <aside className="dsb" style={{borderRight:"1px solid rgba(240,235,225,0.05)",padding:"20px 15px",position:"sticky",top:70,height:"calc(100vh - 70px)",overflowY:"auto",flexDirection:"column"}}>
          <SidebarContent {...sidebarProps}/>
        </aside>

        <main ref={mainRef} className="app-main" style={{padding:"18px 22px 24px"}}>
          {/* mobile: tabs de conteúdo */}
          {mobileTab==="descobrir"&&!swipeRecipe ? (
            <div className="disc-stage" style={{position:"fixed",inset:"70px 0 65px 0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,opacity:.45}}>
              <span style={{fontSize:28}}>🥃</span>
              <span style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.5)"}}>{packConfigLoaded?"nenhuma receita encontrada":"carregando…"}</span>
            </div>
          ) : mobileTab==="descobrir"&&swipeRecipe ? (
            <div className="disc-stage" style={{position:"fixed",inset:`70px 0 calc(50px + env(safe-area-inset-bottom, 8px)) 0`,display:"flex",flexDirection:"column",alignItems:"center",overflow:"hidden",touchAction:"none",backgroundColor:`${getTheme(swipeRecipe.categories).accent}06`,transition:"background-color 1.1s ease"}}>
              {/* fundo atmosférico */}
              {(()=>{const th=getTheme(swipeRecipe.categories);return(<>
                <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 80% 60% at 50% 100%, ${th.accent}18 0%, transparent 70%)`,pointerEvents:"none",transition:"background 1.1s ease"}}/>
                <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 50% 40% at 50% 0%, ${th.accent}08 0%, transparent 60%)`,pointerEvents:"none"}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg, transparent, ${th.accent}44, transparent)`,pointerEvents:"none"}}/>
                {hasFilters&&<div style={{position:"absolute",top:8,left:0,right:0,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
                  <span style={{...CARD_TYPO.counter,color:th.accent}}>{swipeHistIdx+1} / {swipeFiltered?.length}</span>
                </div>}
              </>);})()}
              <div style={{flex:"1 1 auto",width:"100%",minHeight:0,position:"relative"}}>
                {/* peek cards — visíveis nas laterais, reveladas no drag */}
                {[
                  {pr:nextPeekRecipe,pRef:peekNextRef,dx:52},
                  {pr:prevPeekRecipe,pRef:peekPrevRef,dx:-52},
                ].map(({pr,pRef,dx},idx)=>{
                  if(!pr)return null;
                  const th=getTheme(pr.categories);
                  const pv=getCardVisual(pr,spiritCatsAll);
                  const pp=pr.perfil?{perfil:pr.perfil,sensacao:pr.sensacao,ocasiao:pr.ocasiao,flavors:pr.flavors}:recipeProfiles[pr.name];
                  const isRight=dx>0;
                  return(
                    <div key={idx} ref={pRef} style={{
                      position:"absolute",inset:0,
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",
                      padding:"7% 16px 112px",
                      pointerEvents:"none",zIndex:0,
                      opacity:0.22,
                      transform:`translateX(${dx}px)`,
                      transition:"opacity .18s ease, transform .18s ease",
                    }}>
                    <div className="disc-card" style={{
                      width:"100%",maxWidth:285,height:"100%",
                      borderRadius:16,backgroundColor:"#0A0906",...buildCardBgEditorial(pv),
                      border:`1.5px solid ${th.accent}`,
                      overflow:"hidden",position:"relative",
                      transform:"scale(0.88)",
                      WebkitMaskImage:isRight
                        ?"linear-gradient(to left, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 18%, rgba(0,0,0,0.22) 40%, transparent 60%)"
                        :"linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 18%, rgba(0,0,0,0.22) 40%, transparent 60%)",
                      maskImage:isRight
                        ?"linear-gradient(to left, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 18%, rgba(0,0,0,0.22) 40%, transparent 60%)"
                        :"linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 18%, rgba(0,0,0,0.22) 40%, transparent 60%)",
                      boxShadow:"none",
                    }}>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(3,1,0,0.28) 0%, rgba(3,1,0,0.0) 22%, rgba(3,1,0,0.42) 55%, rgba(3,1,0,0.92) 100%)"}}/>
                      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 75% at 50% 50%, transparent 28%, rgba(0,0,0,0.82) 100%)",mixBlendMode:"multiply"}}/>
                      <div style={{position:"absolute",bottom:24,left:20,right:20,display:"flex",flexDirection:"column",gap:10}}>
                        <div style={{fontFamily:"'Gloock',serif",
                          fontSize:pr.name.length>22?26:pr.name.length>18?30:pr.name.length>14?35:pr.name.length>11?38:pr.name.length>7?48:55,
                          fontWeight:400,lineHeight:1.15,color:"rgba(231,224,205,0.95)",letterSpacing:"-0.3px",
                          overflow:"hidden",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",
                          textShadow:"0 1px 4px rgba(0,0,0,0.8), 0 2px 14px rgba(0,0,0,0.6)"}}>{pr.name}</div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{height:2,width:36,background:th.accent,borderRadius:2,opacity:0.9}}/>
                          <div style={{width:7,height:2,borderRadius:1,background:th.accent,opacity:0.9}}/>
                        </div>
                        {pp?.flavors&&<div style={{...CARD_TYPO.flavor,color:th.accent}}>{pp.flavors.replace(/·/g,"•")}</div>}
                        {pp?.perfil&&(
                          <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1.5px solid ${th.accent}30`}}>
                            {[["◈","Perfil",pp.perfil],["❋","Sensação",pp.sensacao],["✦","Ocasião",pp.ocasiao]].map((item,i)=>(
                              <div key={i} style={{display:"contents"}}>
                                {i>0&&<div style={{width:1,alignSelf:"stretch",background:`${th.accent}28`,flexShrink:0,margin:"0 2px"}}/>}
                                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,flex:1}}>
                                  <span style={{...CARD_TYPO.sigIcon,color:th.accent}}>{item[0]}</span>
                                  <span style={CARD_TYPO.sigLabel}>{item[1]}</span>
                                  <span style={{...CARD_TYPO.sigValue,fontSize:item[2]?.length>10?7:item[2]?.length>7?8:9}}>{item[2]}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  );
                })}
                {/* sem sombra central — o maskImage dos peek cards já garante a separação */}
                <SwipeCard key={swipeRecipe.name} recipe={swipeRecipe} onComanda={()=>toggleComanda(swipeRecipe.name)} isComanda={comanda.includes(swipeRecipe.name)} onTried={()=>{const wasTried=tried.includes(swipeRecipe.name);handleTried(swipeRecipe.name);if(!wasTried)setTimeout(nextSwipeRecipe,380);}} isTried={tried.includes(swipeRecipe.name)} onNext={nextSwipeRecipe} onPrev={prevSwipeRecipe} hasPrev={swipeHistIdx>0} onOpen={r=>setOpen(r)} onDragChange={handleDragChange} profile={swipeRecipe.perfil?{perfil:swipeRecipe.perfil,sensacao:swipeRecipe.sensacao,ocasiao:swipeRecipe.ocasiao,flavors:swipeRecipe.flavors}:recipeProfiles[swipeRecipe.name]} spiritCats={spiritCatsAll} customBg={customBgs[swipeRecipe.name]} onSetCustomBg={url=>setCustomBgs(p=>({...p,[swipeRecipe.name]:url}))} onClearCustomBg={()=>setCustomBgs(p=>{const n={...p};delete n[swipeRecipe.name];return n;})} packName={activePack&&activePackNames?.has(swipeRecipe.name)?activePack:recipePackMap[swipeRecipe.name]}/>
                {/* botões de ação — sobre o card */}
                <div className="disc-actions" style={{position:"absolute",bottom:24,left:0,right:0,zIndex:10,display:"grid",gridTemplateColumns:"1fr 1fr",pointerEvents:"none"}}>
                  {(()=>{const isTried=tried.includes(swipeRecipe.name);return(
                  <div style={{display:"flex",justifyContent:"center",pointerEvents:"none"}}>
                    <button onClick={()=>{const wasTried=isTried;handleTried(swipeRecipe.name);if(!wasTried)setTimeout(nextSwipeRecipe,380);}}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer",padding:"8px 0",transition:"all .2s",pointerEvents:"auto"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                        width:45,height:45,borderRadius:"50%",
                        background:isTried?"rgba(20,184,166,0.22)":"rgba(240,235,225,0.08)",
                        border:`1.5px solid ${isTried?"rgba(20,184,166,0.7)":"rgba(240,235,225,0.22)"}`,
                        boxShadow:isTried?"0 0 28px rgba(20,184,166,0.55), 0 0 56px rgba(20,184,166,0.2), inset 0 1px 0 rgba(255,255,255,0.1)":"0 0 18px rgba(240,235,225,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
                        fontSize:26,color:isTried?"#4ADE80":"rgba(240,235,225,0.6)",
                        transition:"all .25s"}}>✓</div>
                      <span style={{...CARD_TYPO.uiLabel,color:isTried?"#4ADE80":"rgba(240,235,225,0.55)"}}>já provei</span>
                    </button>
                  </div>
                  );})()}
                  {(()=>{const isComanda=comanda.includes(swipeRecipe.name);return(
                  <div style={{display:"flex",justifyContent:"center",pointerEvents:"none"}}>
                    <button onClick={()=>toggleComanda(swipeRecipe.name)}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer",padding:"8px 0",transition:"all .2s",pointerEvents:"auto"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                        width:45,height:45,borderRadius:"50%",
                        background:isComanda?"rgba(160,120,90,0.25)":"rgba(240,235,225,0.08)",
                        border:`1.5px solid ${isComanda?"rgba(200,169,110,0.7)":"rgba(240,235,225,0.22)"}`,
                        boxShadow:isComanda?"0 0 28px rgba(160,120,90,0.55), 0 0 56px rgba(160,120,90,0.2), inset 0 1px 0 rgba(255,255,255,0.1)":"0 0 18px rgba(240,235,225,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
                        transition:"all .25s",color:isComanda?"#E5C99E":"rgba(240,235,225,0.6)"}}>
                          <svg width={isComanda?18:20} height={isComanda?18:20} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 4 L19 4 L11 14 Z"/><line x1="11" y1="14" x2="11" y2="19"/><line x1="7" y1="19" x2="15" y2="19"/>
                          </svg>
                        </div>
                      <span style={{...CARD_TYPO.uiLabel,color:isComanda?"#C8A96E":"rgba(240,235,225,0.55)"}}>{isComanda?"adicionado à comanda":"adicionar à comanda"}</span>
                    </button>
                  </div>
                  );})()}
                </div>
              </div>
              {/* controles bottom — sheets flutuam sobre o layout sem empurrar */}
              <div className="disc-controls" style={{flexShrink:0,width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",paddingTop:6,paddingBottom:14,background:`radial-gradient(ellipse 100% 140% at 50% 100%, ${getTheme(swipeRecipe.categories).accent}1a 0%, ${getTheme(swipeRecipe.categories).accent}08 45%, transparent 75%)`,transition:"background 1.1s ease",position:"relative"}}>

                {(filterSheet==="ocasiao"||filterSheet==="pack")&&(
                  <div style={{position:"absolute",bottom:"100%",left:12,right:12,marginBottom:6,background:"rgba(42,28,14,0.52)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(160,120,90,0.28)",borderRadius:12,padding:"12px 14px",zIndex:30,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {filterSheet==="ocasiao"?[...OCCASION_LIST].sort((a,b)=>a.localeCompare(b,"pt")).map(tag=>{
                        const active=activeOccasions.includes(tag);
                        return(<button key={tag} onClick={()=>toggleOccasion(tag)} style={{padding:"7px 13px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",
                          background:active?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                          border:`1px solid ${active?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                          color:active?"#C8A96E":"rgba(240,235,225,0.45)"}}>{tag}</button>);
                      }):accessiblePacks.filter(pk=>(pk.recipeNames||[]).length>0).sort((a,b)=>a.name.localeCompare(b.name,"pt")).map(pk=>{
                        const active=activePack===pk.name;
                        return(<button key={pk.id} onClick={()=>{setActivePack(active?null:pk.name);setFilterSheet(null);}} style={{padding:"7px 13px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",
                          background:active?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                          border:`1px solid ${active?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                          color:active?"#C8A96E":"rgba(240,235,225,0.45)"}}>{pk.name}</button>);
                      })}
                    </div>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
                  <button onClick={()=>setFilterSheet(filterSheet==="ocasiao"?null:"ocasiao")}
                    style={{...CARD_TYPO.uiLabel,display:"flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,cursor:"pointer",transition:"all .2s",
                      background:activeOccasions.length||filterSheet==="ocasiao"?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                      border:`1px solid ${activeOccasions.length||filterSheet==="ocasiao"?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.12)"}`,
                      color:activeOccasions.length||filterSheet==="ocasiao"?"#C8A96E":"rgba(240,235,225,0.35)"}}>
                    {activeOccasions.length?"◈ "+activeOccasions[0]+(activeOccasions.length>1?` +${activeOccasions.length-1}`:"")+" ×":"◈ Ocasião"}
                  </button>
                </div>
                <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
                  {accessiblePacks.length>0&&<button onClick={()=>activePack?setActivePack(null):setFilterSheet(filterSheet==="pack"?null:"pack")}
                    style={{...CARD_TYPO.uiLabel,display:"flex",alignItems:"center",gap:6,padding:"5px 13px",borderRadius:20,cursor:"pointer",transition:"all .2s",
                      background:activePack||filterSheet==="pack"?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                      border:`1px solid ${activePack||filterSheet==="pack"?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.12)"}`,
                      color:activePack||filterSheet==="pack"?"#C8A96E":"rgba(240,235,225,0.35)"}}>
                    {activePack?activePack+" ×":"◈ Pack"}
                  </button>}
                </div>
                <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
                  <button onClick={()=>{setSwipeUnprovenOnly(v=>{const n=!v;if(n)localStorage.setItem("otr_swipe_unproven","1");else localStorage.removeItem("otr_swipe_unproven");return n;})}}
                    style={{...CARD_TYPO.uiLabel,padding:"5px 13px",borderRadius:20,background:swipeUnprovenOnly?"rgba(74,222,128,0.1)":"rgba(240,235,225,0.04)",border:`1px solid ${swipeUnprovenOnly?"rgba(74,222,128,0.35)":"rgba(240,235,225,0.12)"}`,color:swipeUnprovenOnly?"#4ADE80":"rgba(240,235,225,0.35)",cursor:"pointer",transition:"all .2s"}}>
                    {swipeUnprovenOnly?"Não provadas ×":"◈ Não provadas"}
                  </button>
                </div>
              </div>
            </div>
          ) : mobileTab==="ingredientes" ? (
            <div style={{paddingBottom:100,display:"flex",flexDirection:"column",gap:0}}>
              {/* hero */}
              <div style={{position:"relative",margin:"-18px -22px 24px",padding:"16px 24px 14px",overflow:"hidden",background:"linear-gradient(to bottom,rgba(30,16,4,0.98) 0%,rgba(8,5,1,0.99) 100%)"}}>
                <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 90% 70% at 10% 120%,rgba(160,120,90,0.4) 0%,rgba(160,120,90,0.08) 45%,transparent 70%)",pointerEvents:"none"}}/>
                <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 50% 35% at 90% -10%,rgba(160,120,90,0.12) 0%,transparent 65%)",pointerEvents:"none"}}/>
                <div style={{...CARD_TYPO.heroEyebrow,color:"rgba(160,120,90,0.55)",marginBottom:4,letterSpacing:3,position:"relative"}}>O QUE VOCÊ TEM</div>
                <div style={{fontFamily:"'Gloock',serif",fontSize:28,fontWeight:400,color:"rgba(231,224,205,0.97)",lineHeight:1.05,letterSpacing:"-0.5px",marginBottom:8,position:"relative",textShadow:"0 1px 12px rgba(0,0,0,0.9)"}}>Meu Bar</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,position:"relative"}}>
                  <div style={{height:1.5,width:26,background:"#A0785A",borderRadius:2,opacity:0.9}}/>
                  <div style={{width:5,height:1.5,borderRadius:1,background:"#A0785A",opacity:0.9}}/>
                </div>
                <div style={{...CARD_TYPO.bodyText,fontSize:13,color:"rgba(240,235,225,0.4)",position:"relative"}}>Marque o que você tem e descubra o que pode fazer.</div>
              </div>

              {/* spirits */}
              <div style={{marginBottom:20,background:"rgba(0,0,0,0.28)",border:"1px solid rgba(240,235,225,0.11)",borderRadius:14,padding:"18px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <div style={{height:1,width:14,background:"#A0785A",opacity:0.6,borderRadius:1}}/>
                  <span style={{...CARD_TYPO.sectionHead,color:"rgba(160,120,90,0.75)"}}>Bebidas</span>
                  {owned.length>0&&<button onClick={()=>setOwned([])} style={{marginLeft:"auto",padding:"3px 10px",borderRadius:20,...CARD_TYPO.uiLabel,fontSize:10,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.35)",cursor:"pointer"}}>limpar</button>}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {allSpirits.map(s=>{
                    const has=owned.includes(s);
                    return(
                      <button key={s} onClick={()=>toggleOwned(s)}
                        style={{padding:"7px 13px",borderRadius:20,fontSize:12,
                          background:has?"rgba(160,120,90,0.18)":"rgba(240,235,225,0.03)",
                          border:`1.5px solid ${has?"rgba(160,120,90,0.65)":"rgba(240,235,225,0.08)"}`,
                          color:has?"#C8A96E":"rgba(240,235,225,0.38)",
                          cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .15s",
                          boxShadow:has?"0 0 10px rgba(160,120,90,0.18)":"none"}}>
                        {has&&<span style={{marginRight:4,fontSize:9}}>✓</span>}{s}
                      </button>
                    );
                  })}
                </div>
                {owned.length>1&&(
                  <button onClick={()=>setFilterAnd(p=>!p)} style={{display:"flex",alignItems:"center",gap:8,marginTop:14,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"Archivo,sans-serif"}}>
                    <div style={{width:32,height:18,borderRadius:9,background:filterAnd?"rgba(160,120,90,0.5)":"rgba(240,235,225,0.08)",border:`1px solid ${filterAnd?"rgba(160,120,90,0.8)":"rgba(240,235,225,0.15)"}`,position:"relative",transition:"all .2s",flexShrink:0}}>
                      <div style={{position:"absolute",top:3,left:filterAnd?14:3,width:10,height:10,borderRadius:5,background:filterAnd?"#C8A96E":"rgba(240,235,225,0.3)",transition:"left .2s"}}/>
                    </div>
                    <span style={{fontSize:11,color:filterAnd?"#C8A96E":"rgba(240,235,225,0.35)",transition:"color .2s",letterSpacing:.3}}>{filterAnd?"no mesmo drink":"qualquer um destes"}</span>
                  </button>
                )}
              </div>

              {/* adicionar bebida */}
              <div style={{marginBottom:24,background:"rgba(0,0,0,0.28)",border:"1px solid rgba(240,235,225,0.11)",borderRadius:14,padding:"18px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <div style={{height:1,width:14,background:"#A0785A",opacity:0.6,borderRadius:1}}/>
                  <span style={{...CARD_TYPO.sectionHead,color:"rgba(160,120,90,0.75)"}}>Adicionar bebida</span>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={spiritSearch} onChange={e=>setSpiritSearch(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&spiritSearch.trim()){setCustomSpirits(p=>[...new Set([...p,spiritSearch.trim()])]);setSpiritSearch("");}}}
                    placeholder="ex: Fernet, Licor 43…"
                    style={{flex:1,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.15)",borderRadius:8,padding:"10px 14px",color:"#F0EBE1",fontSize:13,outline:"none",fontFamily:"Archivo,sans-serif"}}/>
                  <button onClick={()=>{if(spiritSearch.trim()){setCustomSpirits(p=>[...new Set([...p,spiritSearch.trim()])]);setSpiritSearch("");}}}
                    style={{padding:"10px 16px",borderRadius:8,background:"rgba(160,120,90,0.12)",border:"1px solid rgba(160,120,90,0.3)",color:"#A0785A",fontSize:16,cursor:"pointer"}}>+</button>
                </div>
                {customSpirits.length>0&&(
                  <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid rgba(240,235,225,0.05)"}}>
                    <div style={{...CARD_TYPO.sectionHead,color:"rgba(240,235,225,0.3)",marginBottom:10}}>Adicionadas</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {customSpirits.map(s=>(
                        <button key={s} onClick={()=>showConfirm(`Remover "${s}" do seu bar?`,()=>setCustomSpirits(p=>p.filter(x=>x!==s)),false)} style={{padding:"5px 10px",borderRadius:20,fontSize:11,background:"rgba(160,120,90,0.08)",border:"1px solid rgba(160,120,90,0.2)",color:"rgba(160,120,90,0.6)",cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>{s} ×</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* receitas possíveis */}
              {owned.length>0&&(()=>{
                const possiveis=filterAnd
                  ?drinkRecipes.filter(r=>owned.every(s=>r.categories.includes(s)))
                  :drinkRecipes.filter(r=>owned.some(s=>r.categories.includes(s)));
                if(!possiveis.length)return null;
                return(
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{height:1,width:14,background:"#A0785A",opacity:0.6,borderRadius:1}}/>
                        <span style={{...CARD_TYPO.sectionHead,color:"rgba(160,120,90,0.75)"}}>{filterAnd?"No mesmo drink":"Drinks com estes"} <span style={{color:"#C8A96E",fontFamily:"'Gloock',serif",fontSize:14,letterSpacing:0,textTransform:"none",fontWeight:400}}>{possiveis.length}</span></span>
                      </div>
                      <button onClick={()=>{setActiveSpirits(owned);setFilterAnd(filterAnd);setFilterMode("tudo");setMobileTab("explorar");}}
                        style={{...CARD_TYPO.uiLabel,color:"rgba(240,235,225,0.3)",background:"none",border:"none",cursor:"pointer"}}>
                        ver todos →
                      </button>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {possiveis.map((r,i)=><Reveal key={r._docId??r.id??r.name} index={i}><DrinkCard recipe={r} isFav={favs.includes(r.name)} onFav={()=>toggleFav(r.name)} isTried={tried.includes(r.name)} onTried={()=>handleTried(r.name)} isComanda={comanda.includes(r.name)} onComanda={()=>toggleComanda(r.name)} hasAll={hasAllIngredients(r)} onClick={()=>{explorarScrollRef.current={pos:mainRef.current?.scrollTop||0,tab:mobileTab};setOpen(r);}} onDelete={null} spiritCats={spiritCatsAll} customBg={customBgs[r.name]} packName={recipePackMap[r.name]}/></Reveal>)}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : mobileTab==="comanda" ? (
            <div style={{paddingBottom:100}}>
              {/* header */}
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{...CARD_TYPO.sectionHead,opacity:1,color:"rgba(160,120,90,0.95)"}}>Comanda</div>
                  <div style={{display:"flex",gap:6}}>
                    {!comandaReorder&&(
                      <button onClick={()=>{setShowNewGroupInput(v=>!v);setNewGroupName('');}} style={{padding:"3px 10px",borderRadius:20,fontSize:10,background:showNewGroupInput?"rgba(160,120,90,0.12)":"none",border:`1px solid ${showNewGroupInput?"rgba(160,120,90,0.4)":"rgba(240,235,225,0.13)"}`,color:showNewGroupInput?"#C8A96E":"rgba(240,235,225,0.52)",cursor:"pointer",fontFamily:"Archivo,sans-serif",letterSpacing:.5}}>+ Grupo</button>
                    )}
                    {comanda.length>1&&(
                      <button onClick={()=>{setComandaReorder(r=>!r);setShowNewGroupInput(false);}} style={{padding:"3px 10px",borderRadius:20,fontSize:10,background:comandaReorder?"rgba(160,120,90,0.12)":"none",border:`1px solid ${comandaReorder?"rgba(160,120,90,0.4)":"rgba(240,235,225,0.13)"}`,color:comandaReorder?"#C8A96E":"rgba(240,235,225,0.52)",cursor:"pointer",fontFamily:"Archivo,sans-serif",letterSpacing:.5}}>{comandaReorder?"concluir":"⇅ ordenar"}</button>
                    )}
                    {comanda.length>0&&!comandaReorder&&(
                      <button onClick={()=>{setComanda([]);setComandaGroups(p=>p.map(g=>({...g,drinks:[]})));}} style={{padding:"3px 10px",borderRadius:20,fontSize:10,background:"none",border:"1px solid rgba(240,235,225,0.13)",color:"rgba(240,235,225,0.52)",cursor:"pointer",fontFamily:"Archivo,sans-serif",letterSpacing:.5}}>limpar</button>
                    )}
                  </div>
                </div>
                {showNewGroupInput&&(
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <input autoFocus value={newGroupName} onChange={e=>setNewGroupName(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&newGroupName.trim()){addComandaGroup(newGroupName.trim());setNewGroupName('');setShowNewGroupInput(false);}if(e.key==="Escape")setShowNewGroupInput(false);}}
                      placeholder="Nome do grupo…"
                      style={{flex:1,background:"rgba(240,235,225,0.05)",border:"1px solid rgba(240,235,225,0.15)",borderRadius:8,padding:"7px 12px",color:"#F0EBE1",fontSize:13,outline:"none",fontFamily:"Archivo,sans-serif"}}/>
                    <button onClick={()=>{if(newGroupName.trim()){addComandaGroup(newGroupName.trim());setNewGroupName('');setShowNewGroupInput(false);}}} style={{padding:"7px 14px",borderRadius:8,background:"rgba(160,120,90,0.12)",border:"1px solid rgba(160,120,90,0.4)",color:"#C8A96E",fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif"}}>Criar</button>
                  </div>
                )}
                <div style={{fontSize:13,color:"rgba(240,235,225,0.45)",lineHeight:1.5,marginTop:6}}>Os drinks que você quer pedir na próxima noite.</div>
              </div>
              {comanda.length===0?(
                <div style={{textAlign:"center",padding:"80px 0",color:"rgba(240,235,225,0.3)"}}>
                  <div style={{marginBottom:14,opacity:0.4}}><svg width="44" height="44" viewBox="0 0 22 22" fill="none" stroke="rgba(200,169,110,0.9)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4 L19 4 L11 14 Z"/><line x1="11" y1="14" x2="11" y2="19"/><line x1="7" y1="19" x2="15" y2="19"/></svg></div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontStyle:"italic",marginBottom:8}}>Comanda vazia</div>
                  <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>Adicione drinks pela ficha de cada receita</div>
                </div>
              ):(()=>{
                const groupedNames=new Set(comandaGroups.flatMap(g=>g.drinks));
                const ungrouped=comanda.map(n=>allRecipes.find(r=>r.name===n)).filter(Boolean).filter(r=>!groupedNames.has(r.name));
                const btnBase={background:"rgba(0,0,0,0.5)",border:"1px solid rgba(240,235,225,0.15)",borderRadius:3,width:26,height:22,color:"rgba(240,235,225,0.55)",cursor:"pointer",fontSize:11,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"};
                const renderCard=r=>{
                  const th=getTheme(r.categories);
                  const styleTag=r.categories.find(c=>STYLE_CATS.has(c));
                  const spiritTag=r.categories.find(c=>spiritCatsAll.has(c));
                  const cv=getCardVisual(r,spiritCatsAll);
                  const dv=customBgs[r.name]?{...cv,bgImage:customBgs[r.name]}:cv;
                  const isLP=comandaLongPress===r.name;
                  return(
                    <div key={r.name}
                      onClick={()=>{if(comandaLongPress){setComandaLongPress(null);return;}explorarScrollRef.current={pos:mainRef.current?.scrollTop||0,tab:mobileTab};setOpen(r);}}
                      onTouchStart={()=>startLongPress(r.name)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      style={{position:"relative",height:120,borderRadius:12,backgroundColor:"#0A0906",...buildCardBgEditorial(dv),
                        border:`1.5px solid ${isLP?"rgba(239,68,68,0.75)":th.accent}`,overflow:"hidden",cursor:"pointer",
                        boxShadow:`0 4px 16px rgba(0,0,0,0.9), 0 0 30px ${th.accent}10`,opacity:isLP?.82:1,transition:"border-color .15s,opacity .15s"}}>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(3,1,0,0.18) 0%, rgba(3,1,0,0.0) 18%, rgba(3,1,0,0.6) 60%, rgba(3,1,0,0.96) 100%)",pointerEvents:"none"}}/>
                      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 75% at 50% 50%, transparent 28%, rgba(0,0,0,0.8) 100%)",mixBlendMode:"multiply",pointerEvents:"none"}}/>
                      <div style={{position:"absolute",inset:0,borderRadius:12,pointerEvents:"none",mixBlendMode:"screen",background:`radial-gradient(ellipse 80% 45% at -8% 108%, ${th.accent} 0%, ${th.accent}aa 5%, ${th.accent}55 22%, ${th.accent}18 45%, transparent 68%)`}}/>
                      <div style={{position:"absolute",top:10,left:14,right:10,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
                        <div style={{display:"flex",gap:7,alignItems:"center"}}>
                          {styleTag&&<span style={CARD_TYPO.tag}>{styleTag}</span>}
                          {spiritTag&&<><span style={{...CARD_TYPO.tag,color:th.accent,opacity:.3}}>·</span><span style={{...CARD_TYPO.tag,color:"rgba(240,235,225,0.42)"}}>{spiritTag}</span></>}
                        </div>
                        {recipePackMap[r.name]&&<div style={{display:"inline-flex",alignItems:"center",gap:4,flexShrink:0,padding:"1px 7px 1px 5px",borderRadius:20,background:"rgba(0,0,0,0.52)",border:`1px solid ${th.accent}44`,backdropFilter:"blur(4px)"}}>
                          <span style={{fontSize:7,color:th.accent,opacity:0.8,lineHeight:1}}>◈</span>
                          <span style={{fontSize:7,letterSpacing:1.5,textTransform:"uppercase",color:`${th.accent}CC`,fontFamily:"Archivo,sans-serif",fontWeight:600}}>{recipePackMap[r.name]}</span>
                        </div>}
                      </div>
                      <div style={{position:"absolute",bottom:12,left:14,right:comandaReorder?54:14,display:"flex",flexDirection:"column",gap:5}}>
                        <div style={{fontFamily:"'Gloock',serif",fontSize:r.name.length>22?15:r.name.length>16?17:19,fontWeight:400,color:"rgba(231,224,205,0.97)",lineHeight:1.15,textShadow:"0 1px 4px rgba(0,0,0,0.9)"}}>{r.name}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{height:2,width:20,background:th.accent,borderRadius:2,opacity:0.9}}/>
                          <div style={{width:4,height:2,borderRadius:1,background:th.accent,opacity:0.9}}/>
                        </div>
                      </div>
                      {comandaReorder&&(()=>{
                        const grp=comandaGroups.find(g=>g.drinks.includes(r.name));
                        const seq=grp?grp.drinks:comanda.filter(n=>!groupedNames.has(n));
                        const pos=seq.indexOf(r.name);
                        return(
                        <div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:4}}>
                          <button onClick={e=>{e.stopPropagation();moveInComanda(r.name,-1);}} disabled={pos<=0} style={{...btnBase,opacity:pos<=0?.3:1}}>↑</button>
                          <button onClick={e=>{e.stopPropagation();moveInComanda(r.name,1);}} disabled={pos===seq.length-1} style={{...btnBase,opacity:pos===seq.length-1?.3:1}}>↓</button>
                        </div>
                        );
                      })()}
                    </div>
                  );
                };
                const groupHeaderSt={display:"flex",alignItems:"center",gap:8,padding:"8px 4px",cursor:"pointer",userSelect:"none"};
                const chevronSt=(open)=>({fontSize:16,color:"rgba(160,120,90,0.8)",transition:"transform .2s",display:"inline-block",transform:open?"rotate(90deg)":"rotate(0deg)",lineHeight:1});
                return(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {/* sem grupo */}
                    {ungrouped.length>0&&(
                      <div>
                        {comandaGroups.length>0&&(
                          <div style={groupHeaderSt} onClick={()=>setUngroupedCollapsed(v=>!v)}>
                            <span style={chevronSt(!ungroupedCollapsed)}>›</span>
                            <span style={{fontFamily:"Archivo,sans-serif",fontSize:11,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(240,235,225,0.45)",fontWeight:700}}>Sem grupo</span>
                            <span style={{fontSize:10,color:"rgba(240,235,225,0.3)",marginLeft:4}}>{ungrouped.length}</span>
                          </div>
                        )}
                        {!ungroupedCollapsed&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{ungrouped.map(renderCard)}</div>}
                      </div>
                    )}
                    {/* grupos nomeados */}
                    {comandaGroups.map(group=>{
                      const gDrinks=group.drinks.map(n=>allRecipes.find(r=>r.name===n)).filter(Boolean);
                      return(
                        <div key={group.id}>
                          <div style={{...groupHeaderSt,justifyContent:"space-between"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}} onClick={()=>toggleGroupCollapse(group.id)}>
                              <span style={chevronSt(!group.collapsed)}>›</span>
                              {editGroupId===group.id?(
                                <input autoFocus value={editGroupName} onChange={e=>setEditGroupName(e.target.value)}
                                  onBlur={()=>{renameGroup(group.id,editGroupName);setEditGroupId(null);}}
                                  onKeyDown={e=>{if(e.key==="Enter"){renameGroup(group.id,editGroupName);setEditGroupId(null);}if(e.key==="Escape")setEditGroupId(null);}}
                                  onClick={e=>e.stopPropagation()}
                                  style={{flex:1,background:"rgba(240,235,225,0.05)",border:"1px solid rgba(160,120,90,0.4)",borderRadius:6,padding:"3px 8px",color:"#F0EBE1",fontSize:12,outline:"none",fontFamily:"Archivo,sans-serif"}}/>
                              ):(
                                <span style={{fontFamily:"Archivo,sans-serif",fontSize:11,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(200,169,110,0.85)",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{group.name}</span>
                              )}
                              <span style={{fontSize:10,color:"rgba(240,235,225,0.3)",flexShrink:0}}>{gDrinks.length}</span>
                            </div>
                            <div style={{display:"flex",gap:4,flexShrink:0}}>
                              <button onClick={e=>{e.stopPropagation();setEditGroupId(group.id);setEditGroupName(group.name);}} style={{background:"none",border:"none",color:"rgba(240,235,225,0.3)",cursor:"pointer",fontSize:13,padding:"2px 4px"}}>✎</button>
                              <button onClick={e=>{e.stopPropagation();deleteComandaGroup(group.id);}} style={{background:"none",border:"none",color:"rgba(239,68,68,0.45)",cursor:"pointer",fontSize:14,padding:"2px 4px"}}>×</button>
                            </div>
                          </div>
                          {!group.collapsed&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{gDrinks.map(renderCard)}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {/* long press overlay */}
              {comandaLongPress&&(()=>{
                const currentGroupId=comandaGroups.find(g=>g.drinks.includes(comandaLongPress))?.id||null;
                const ovBtnSt={display:"block",width:"100%",padding:"12px 16px",background:"none",border:"none",borderRadius:10,fontSize:14,textAlign:"left",cursor:"pointer",fontFamily:"Archivo,sans-serif"};
                return(
                  <div style={{position:"fixed",inset:0,zIndex:10001,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,0.5)"}} onClick={()=>setComandaLongPress(null)}>
                    <div onClick={e=>e.stopPropagation()} style={{background:"#111008",borderRadius:"18px 18px 0 0",padding:"12px 8px calc(24px + env(safe-area-inset-bottom, 12px))",border:"1px solid rgba(160,120,90,0.25)",borderBottom:"none"}}>
                      <div style={{textAlign:"center",marginBottom:12}}>
                        <div style={{width:36,height:4,borderRadius:2,background:"rgba(240,235,225,0.15)",margin:"0 auto 14px"}}/>
                        <div style={{fontFamily:"'Gloock',serif",fontSize:17,color:"rgba(231,224,205,0.92)"}}>{comandaLongPress}</div>
                      </div>
                      <div style={{height:"1px",background:"rgba(240,235,225,0.08)",margin:"0 8px 8px"}}/>
                      <button style={{...ovBtnSt,color:"rgba(239,68,68,0.8)"}} onClick={()=>{toggleComanda(comandaLongPress);setComandaLongPress(null);}}>✕  Remover da comanda</button>
                      {comandaGroups.length>0&&(
                        <>
                          <div style={{height:"1px",background:"rgba(240,235,225,0.08)",margin:"4px 8px"}}/>
                          <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.35)",padding:"6px 16px 2px",fontFamily:"Archivo,sans-serif"}}>Mover para</div>
                          {currentGroupId&&(
                            <button style={{...ovBtnSt,color:"rgba(240,235,225,0.6)"}} onClick={()=>{moveDrinkToUngrouped(comandaLongPress);setComandaLongPress(null);}}>◌  Sem grupo</button>
                          )}
                          {comandaGroups.filter(g=>g.id!==currentGroupId).map(g=>(
                            <button key={g.id} style={{...ovBtnSt,color:"rgba(200,169,110,0.85)"}} onClick={()=>{moveDrinkToGroup(comandaLongPress,g.id);setComandaLongPress(null);}}>›  {g.name}</button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : mobileTab==="perfil" ? (
            <ProfileTab allRecipes={allRecipes} drinkCount={drinkRecipes.length} tried={tried} favs={favs} owned={owned} customRecipes={customRecipes} exportJSON={exportJSON} importRef={importRef} user={user} syncing={syncing} onGoTo={openProfileList} onOpenRecipe={r=>{setOpen(r);setMobileTab("explorar");}} onRestoreAll={restoreAll} onRestoreRecipes={restoreRecipes} onAddRecipe={()=>setShowForm(true)} onTutorial={()=>{localStorage.removeItem("otr_tutorial_done");setShowTutorial(true);}} availPacks={availPacks} unlockedPacks={unlockedPacks} devMode={devMode}/>
          ) : (
            <>
              {/* sub-tela do Perfil: cabeçalho para voltar mantendo o contexto */}
              {profileView&&(
                <button className="mnv" onClick={backToProfile} style={{display:"flex",alignItems:"center",gap:7,background:"none",border:"none",padding:"0 0 14px",cursor:"pointer",color:"rgba(200,169,110,0.9)",fontFamily:"Archivo,sans-serif"}}>
                  <span style={{fontSize:17,lineHeight:1,marginTop:-1}}>‹</span>
                  <span style={{fontSize:10,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700}}>Perfil</span>
                </button>
              )}
              {/* backdrop click-outside para fechar filtro */}
              {filterSheet&&<div onClick={()=>setFilterSheet(null)} style={{position:"fixed",inset:0,zIndex:98}}/>}
              {/* mobile: botões família + spirit + filtros */}
              <div className="mnv" style={{display:"none",position:"relative",marginBottom:10,zIndex:99}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingBottom:4}}>
                  {/* família */}
                  <button onClick={()=>activeStyle?setActiveStyle(null):setFilterSheet(filterSheet==="familia"?null:"familia")}
                    style={{...CARD_TYPO.uiLabel,padding:"8px 16px",borderRadius:20,flexShrink:0,cursor:"pointer",transition:"all .15s",
                      background:activeStyle?(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).bg:filterSheet==="familia"?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                      border:`1px solid ${activeStyle?(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).border+"66":filterSheet==="familia"?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                      color:activeStyle?(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).label:filterSheet==="familia"?"#C8A96E":"rgba(240,235,225,0.45)"}}>
                    {activeStyle||"Família"}{activeStyle?" ×":""}
                  </button>
                  {/* spirit */}
                  <button onClick={()=>activeSpirits.length?setActiveSpirits([]):setFilterSheet(filterSheet==="spirit"?null:"spirit")}
                    style={{...CARD_TYPO.uiLabel,padding:"8px 16px",borderRadius:20,flexShrink:0,cursor:"pointer",transition:"all .15s",
                      background:activeSpirits.length||filterSheet==="spirit"?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                      border:`1px solid ${activeSpirits.length||filterSheet==="spirit"?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                      color:activeSpirits.length||filterSheet==="spirit"?"#C8A96E":"rgba(240,235,225,0.45)"}}>
                    {activeSpirits.length?activeSpirits[0]+(activeSpirits.length>1?` +${activeSpirits.length-1}`:"")+" ×":"Spirit"}
                  </button>
                  {/* ocasião */}
                  <button onClick={()=>activeOccasions.length?setActiveOccasions([]):setFilterSheet(filterSheet==="ocasiao"?null:"ocasiao")}
                    style={{...CARD_TYPO.uiLabel,padding:"8px 16px",borderRadius:20,flexShrink:0,cursor:"pointer",transition:"all .15s",
                      background:activeOccasions.length||filterSheet==="ocasiao"?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                      border:`1px solid ${activeOccasions.length||filterSheet==="ocasiao"?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                      color:activeOccasions.length||filterSheet==="ocasiao"?"#C8A96E":"rgba(240,235,225,0.45)"}}>
                    {activeOccasions.length?activeOccasions[0]+(activeOccasions.length>1?` +${activeOccasions.length-1}`:"")+" ×":"Ocasião"}
                  </button>
                  {/* pack */}
                  {accessiblePacks.length>0&&<button onClick={()=>activePack?setActivePack(null):setFilterSheet(filterSheet==="pack"?null:"pack")}
                    style={{...CARD_TYPO.uiLabel,padding:"8px 16px",borderRadius:20,flexShrink:0,cursor:"pointer",transition:"all .15s",
                      background:activePack||filterSheet==="pack"?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                      border:`1px solid ${activePack||filterSheet==="pack"?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                      color:activePack||filterSheet==="pack"?"#C8A96E":"rgba(240,235,225,0.45)"}}>
                    {activePack?activePack+" ×":"Pack"}
                  </button>}
                  {/* filtros rápidos */}
                  {[["favs","Favoritas"],["naoprovei","Não provei"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setFilterMode(filterMode===v?"tudo":v)} style={{...CARD_TYPO.uiLabel,padding:"8px 16px",borderRadius:20,flexShrink:0,whiteSpace:"nowrap",cursor:"pointer",transition:"all .15s",
                      background:filterMode===v?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                      border:`1px solid ${filterMode===v?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                      color:filterMode===v?"#C8A96E":"rgba(240,235,225,0.45)"}}>
                      {l}
                    </button>
                  ))}
                  {(activeStyle||activeSpirits.length||filterMode!=="tudo"||activeOccasions.length>0||activePack)&&(
                    <button onClick={clearAll} style={{...CARD_TYPO.uiLabel,padding:"8px 16px",borderRadius:20,flexShrink:0,cursor:"pointer",background:"none",border:"1px solid rgba(240,235,225,0.13)",color:"rgba(240,235,225,0.28)"}}>limpar</button>
                  )}
                </div>
                {/* sheets como overlays absolutos */}
                {filterSheet==="familia"&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,display:"flex",flexDirection:"column",background:"rgba(42,28,14,0.52)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(160,120,90,0.28)",borderRadius:10,padding:"14px 14px 12px",marginTop:4,gap:8,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {[...FAMILY_GROUPS.flatMap(g=>g.items),...TECHNIQUES].filter(s=>allRecipes.some(r=>r.categories.includes(s))).sort((a,b)=>a.localeCompare(b,"pt")).map(s=>{
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
                {filterSheet==="spirit"&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,display:"flex",flexDirection:"column",background:"rgba(42,28,14,0.52)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(160,120,90,0.28)",borderRadius:10,padding:"14px 14px 12px",marginTop:4,gap:8,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {allSpirits.map(s=>{
                        const active=activeSpirits.includes(s);
                        return(<button key={s} onClick={()=>{toggleSpirit(s);}} style={{padding:"7px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .12s",
                          background:active?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${active?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,color:active?"#C8A96E":"rgba(240,235,225,0.45)"}}>{s}</button>);
                      })}
                    </div>
                  </div>
                )}
                {filterSheet==="ocasiao"&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,display:"flex",flexDirection:"column",background:"rgba(42,28,14,0.52)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(160,120,90,0.28)",borderRadius:10,padding:"14px 14px 12px",marginTop:4,gap:8,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {[...OCCASION_LIST].sort((a,b)=>a.localeCompare(b,"pt")).map(tag=>{
                        const active=activeOccasions.includes(tag);
                        return(<button key={tag} onClick={()=>toggleOccasion(tag)} style={{padding:"7px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .12s",
                          background:active?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                          border:`1px solid ${active?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                          color:active?"#C8A96E":"rgba(240,235,225,0.45)"}}>{tag}</button>);
                      })}
                    </div>
                  </div>
                )}
                {filterSheet==="pack"&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,display:"flex",flexDirection:"column",background:"rgba(42,28,14,0.52)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(160,120,90,0.28)",borderRadius:10,padding:"14px 14px 12px",marginTop:4,gap:8,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {accessiblePacks.filter(pk=>(pk.recipeNames||[]).length>0).sort((a,b)=>a.name.localeCompare(b.name,"pt")).map(pk=>{
                        const active=activePack===pk.name;
                        return(<button key={pk.id} onClick={()=>{setActivePack(active?null:pk.name);setFilterSheet(null);}} style={{padding:"7px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Archivo,sans-serif",transition:"all .12s",
                          background:active?"rgba(160,120,90,0.13)":"rgba(240,235,225,0.04)",
                          border:`1px solid ${active?"rgba(160,120,90,0.45)":"rgba(240,235,225,0.09)"}`,
                          color:active?"#C8A96E":"rgba(240,235,225,0.45)"}}>{pk.name}</button>);
                      })}
                    </div>
                  </div>
                )}
              </div>
              {/* family description */}
              {activeStyle&&FAMILY_DESC[activeStyle]&&(
                <div className="mnv" style={{marginBottom:14,padding:"12px 14px",borderRadius:6,background:`${(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).bg}cc`,border:`1px solid ${(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).border}44`}}>
                  <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:(TYPE_THEME[activeStyle]||TYPE_THEME["_default"]).accent,fontWeight:700,marginBottom:6}}>{activeStyle}</div>
                  <p style={{margin:0,fontSize:12,color:"rgba(240,235,225,0.65)",lineHeight:1.65}}>{FAMILY_DESC[activeStyle]}</p>
                </div>
              )}              {/* mobile: busca */}
              <div className="mnv" style={{marginBottom:14,position:"relative"}}>
                <input ref={searchInputRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="buscar drink, ingrediente…" style={{width:"100%",background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.15)",borderRadius:3,padding:"9px 36px 9px 12px",color:"#F0EBE1",fontSize:13,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="rgba(160,120,90,0.35)"} onBlur={e=>e.target.style.borderColor="rgba(240,235,225,0.08)"}/>
                {search&&<button onClick={()=>{setSearch("");searchInputRef.current?.focus();}} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(240,235,225,0.38)",cursor:"pointer",fontSize:18,lineHeight:1,padding:"4px 6px"}}>×</button>}
              </div>

              {(filterMode==="favs"||filterMode==="provados"||filterMode==="custom")&&(
                <div style={{fontFamily:"'Gloock',serif",fontSize:28,fontWeight:400,color:"rgba(231,224,205,0.92)",letterSpacing:"-0.3px",marginBottom:20,lineHeight:1.2}}>
                  {filterMode==="favs"?"Favoritas":filterMode==="provados"?"Provadas":"Minhas Receitas"}
                </div>
              )}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <span style={{...CARD_TYPO.sectionHead,color:"rgba(240,235,225,0.4)"}}>
                  <span style={{color:"#A0785A"}}>{filtered.length}</span> drink{filtered.length!==1?"s":""}
                  {activeStyle&&` · ${activeStyle}`}
                </span>
                <div style={{display:"flex",gap:5}}>
                  {[["nome","A–Z"],["rating","★ Rating"],["recentes","Recentes"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setSort(v)} style={{...CARD_TYPO.counter,padding:"4px 10px",borderRadius:3,background:sort===v?"rgba(160,120,90,0.1)":"transparent",border:`1px solid ${sort===v?"rgba(160,120,90,0.35)":"rgba(240,235,225,0.07)"}`,color:sort===v?"#A0785A":"rgba(240,235,225,0.26)",transition:"all .12s"}}>{l}</button>
                  ))}
                </div>
              </div>

              {filtered.length===0?(
                <div style={{textAlign:"center",padding:"80px 0",color:"rgba(240,235,225,0.52)"}}>
                  <div style={{fontSize:48,marginBottom:16}}>🍹</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontStyle:"italic",marginBottom:8}}>{packConfigLoaded?"Nenhum drink encontrado":"Carregando receitas…"}</div>
                  {packConfigLoaded&&<div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>Tente outros filtros</div>}
                </div>
              ):(
                <div key={`rev|${activeStyle}|${filterMode}|${activePack}|${activeOccasions.join("+")}|${sort}`} style={{display:"grid",gridTemplateColumns:"1fr",gap:8,paddingBottom:80}}>
                  {filtered.map((r,i)=>(
                    <Reveal key={r._docId??r.id??r.name} index={i}>
                      <DrinkCard recipe={r} isFav={favs.includes(r.name)} onFav={()=>toggleFav(r.name)} isTried={tried.includes(r.name)} onTried={()=>handleTried(r.name)} isComanda={comanda.includes(r.name)} onComanda={()=>toggleComanda(r.name)} hasAll={hasAllIngredients(r)} onClick={()=>{explorarScrollRef.current={pos:mainRef.current?.scrollTop||0,tab:"explorar"};setOpen(r);}} onDelete={()=>showConfirm("Excluir esta receita?",()=>r.custom?deleteRecipe(r):deleteBaseRecipe(r),true)} spiritCats={spiritCatsAll} customBg={customBgs[r.name]} packName={activePack&&activePackNames?.has(r.name)?activePack:recipePackMap[r.name]}/>
                    </Reveal>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>



      {/* ── fade inferior — os cards se dissolvem perto da nav e "surgem" na rolagem ── */}
      {(mobileTab==="explorar"||mobileTab==="ingredientes"||mobileTab==="comanda")&&(
        <div className="mnv" style={{position:"fixed",left:0,right:0,bottom:0,height:176,background:"linear-gradient(to bottom, rgba(7,7,7,0) 0%, rgba(7,7,7,0.45) 30%, rgba(7,7,7,0.82) 60%, #070707 86%)",pointerEvents:"none",zIndex:9998}}/>
      )}

      {/* ── MOBILE NAV ── */}
      <MobileNav accentColor={mobileTab==="descobrir"&&swipeRecipe?getTheme(swipeRecipe.categories).accent:null} tab={profileView?"perfil":mobileTab} setTab={t=>{prevTabRef.current=mobileTab;if(mobileTab==="ingredientes")barScrollRef.current=window.scrollY||0;window.history.pushState({otr:true},"");window.scrollTo(0,0);if(profileView){exitProfileView();}else if(search!==""){setSearch("");}setMobileTab(t);setOpen(null);}} favCount={favs.length} onSameTab={id=>{if(id==="explorar"){setTimeout(()=>searchInputRef.current?.focus(),50);}else if(id==="perfil"&&profileView){backToProfile();}}}/>

      {/* ── MODALS ── */}
      {open&&<Modal key={open.name} recipe={open} profile={open.perfil?{perfil:open.perfil,sensacao:open.sensacao,ocasiao:open.ocasiao,flavors:open.flavors}:recipeProfiles[open.name]} onClose={()=>setOpen(null)} isFav={favs.includes(open.name)} onFav={()=>toggleFav(open.name)} isTried={tried.includes(open.name)} onTried={()=>handleTried(open.name)} isComanda={comanda.includes(open.name)} onComanda={()=>toggleComanda(open.name)} onRating={r=>rateRecipe(open,r)} onNote={n=>noteRecipe(open,n)} onFilter={(type,val)=>{if(type==="style"){setActiveStyle(val);setActiveSpirits([]);}else{setActiveSpirits([val]);setActiveStyle(null);}setOpen(null);setMobileTab("explorar");}} onEdit={()=>{setEditing(open);setOpen(null);}} onDelete={()=>open.custom?deleteRecipe(open):deleteBaseRecipe(open)} onRepo={!open.custom&&overrides[ovKey(open)]&&Object.keys(overrides[ovKey(open)]).some(k=>k!=="rating")?()=>repoRecipe(ovKey(open)):undefined} spiritCats={spiritCatsAll} customBg={customBgs[open.name]} onSetCustomBg={url=>setCustomBgs(p=>({...p,[open.name]:url}))} onClearCustomBg={()=>setCustomBgs(p=>{const n={...p};delete n[open.name];return n;})} bgOffset={customBgOffsets[open.name]} onSetBgOffset={o=>setCustomBgOffsets(p=>({...p,[open.name]:o}))} packName={recipePackMap[open.name]}/>}
      {(showForm||editing)&&<RecipeForm initial={editing} initialProfile={editing?recipeProfiles[editing.name]:null} onSave={saveRecipe} onClose={()=>{setShowForm(false);setEditing(null);setSharedFiles(null);}} customSpirits={customSpirits} sharedFiles={!editing?sharedFiles:null}/>}
      {ratingPopup&&<RatingPopup recipe={ratingPopup} currentRating={allRecipes.find(r=>r.name===ratingPopup.name)?.rating||0} onRate={n=>rateRecipe(ratingPopup,n)} onClose={()=>setRatingPopup(null)}/>}
      {showTutorial&&<Tutorial onClose={closeTutorial} onTabChange={t=>setMobileTab(t)}/>}
      {confirmDialog&&<ConfirmDialog message={confirmDialog.message} danger={confirmDialog.danger} onConfirm={()=>{confirmDialog.onConfirm?.();closeConfirm();}} onCancel={confirmDialog.onConfirm?closeConfirm:null}/>}
    </div>
  );
}
