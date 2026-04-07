import { useState, useMemo, useCallback, useEffect, useRef } from "react";

const TYPE_THEME = {
  "Sour":           { bg:"#1C1400", border:"#C8860A", accent:"#F4A623", label:"#FFD580" },
  "Highball":       { bg:"#00141E", border:"#0A7EA4", accent:"#38BDF8", label:"#7DD3FC" },
  "Collins":        { bg:"#00140A", border:"#16803C", accent:"#4ADE80", label:"#86EFAC" },
  "Spritz":         { bg:"#1E0800", border:"#C2410C", accent:"#FB923C", label:"#FDBA74" },
  "Fizz":           { bg:"#00131A", border:"#0E7490", accent:"#22D3EE", label:"#A5F3FC" },
  "Cocktail":       { bg:"#130018", border:"#7C3AED", accent:"#A78BFA", label:"#DDD6FE" },
  "Não alcóolicos": { bg:"#081400", border:"#4D7C0F", accent:"#84CC16", label:"#D9F99D" },
  "Stirred":        { bg:"#12100A", border:"#8B6914", accent:"#D4A843", label:"#F0CC7A" },
  "Shaken":         { bg:"#0A0018", border:"#6D28D9", accent:"#8B5CF6", label:"#C4B5FD" },
  "Built":          { bg:"#0A0F18", border:"#1D4ED8", accent:"#3B82F6", label:"#93C5FD" },
  "Buck":           { bg:"#180A00", border:"#B45309", accent:"#F59E0B", label:"#FCD34D" },
  "Smash":          { bg:"#001A0A", border:"#065F46", accent:"#10B981", label:"#6EE7B7" },
  "Sling":          { bg:"#1A0010", border:"#9D174D", accent:"#EC4899", label:"#F9A8D4" },
  "Hot":            { bg:"#1A0A00", border:"#DC2626", accent:"#F87171", label:"#FCA5A5" },
  "_default":       { bg:"#151008", border:"#78614A", accent:"#C8A96E", label:"#E5C99E" },
};

const STYLE_PRIORITY = ["Sour","Highball","Collins","Spritz","Fizz","Cocktail","Não alcóolicos","Buck","Smash","Sling","Hot","Stirred","Shaken","Built"];
const STYLE_CATS = new Set(STYLE_PRIORITY);
const SPIRIT_CATS = new Set(["Gim","Rum","Rum Envelhecido","Vodka","Whisky","Tequila","Mezcal","Pisco","Conhaque","Aguardente Velha","Campari","Aperol","Cynar","Amaretto","St‑Germain","Licor Beirão","Luxardo Maraschino","Contreau","Espumante","Vermute Branco","Vermute Tinto","Vermute seco","Jack Apple","Ginger Beer","Ginger Bug","Cachaça"]);
const ALL_SPIRIT_OPTIONS = [...SPIRIT_CATS].sort();

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const FAMILY_GROUPS = [
  { label:"Família", items:["Sour","Highball","Collins","Spritz","Fizz","Cocktail","Sling","Buck","Smash","Hot","Não alcóolicos"] },
];
const TECHNIQUES = ["Stirred","Shaken","Built"];

const BASE_RECIPES = [
  {name:"Aperol Spritz",categories:["Espumante","Highball","Built"],ingredients:["150ml prosecco","100ml Aperol","50ml água com gás","5 cubos gelo","1 rodela laranja"],steps:["Coloque os ingredientes em um copo largo","Obedeça à proporção 3:2:1 — prosecco, Aperol e água com gás"],notes:"",rating:5,servings:"",custom:false},
  {name:"Aviation",categories:["Gim","Luxardo Maraschino","Sour","Shaken"],ingredients:["45 ml gin","15 ml Luxardo Maraschino","15 ml suco de limão","(opcional) 5 ml creme de violeta"],steps:[],notes:"",rating:3,servings:"",custom:false},
  {name:"Beirão & Maracujá",categories:["Collins","Licor Beirão","Built"],ingredients:["40 ml Licor Beirão","30 ml suco de maracujá","10 ml limão","soda"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Beirão + Campari",categories:["Campari","Cocktail","Licor Beirão","Stirred"],ingredients:["30 ml Beirão","30 ml Campari","gelo","casca de laranja"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Beirão Lemon",categories:["Collins","Licor Beirão","Built"],ingredients:["50 ml Licor Beirão","20 ml limão","soda ou água com gás","gelo"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Beirão Spritz",categories:["Espumante","Highball","Licor Beirão","Built"],ingredients:["40 ml Licor Beirão","80 ml espumante","40 ml água com gás","casca de laranja"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Beirão, Mel & Alecrim",categories:["Licor Beirão","Stirred"],ingredients:["50 ml Licor Beirão","15 ml mel","15 ml suco de limão","1 ramo de alecrim","gelo"],steps:["Misture mel e limão primeiro.","Adicione o Beirão e gelo.","Mexa e finalize com alecrim."],notes:"",rating:0,servings:"",custom:false},
  {name:"Belle Époque (Casa do Porco)",categories:["Gim","Shaken"],ingredients:["Gin com infusão de flor de hibisco","Calda de gengibre","Limão Siciliano","Cidre Charlotte Corday"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Bourbon, laranja e gengibre",categories:["Whisky","Built"],ingredients:["2 oz bourbon","1 oz triple sec","3 col. sopa xarope de gengibre","3 oz suco de laranja","gelo esmagado"],steps:["Prepare o xarope de gengibre: ferva gengibre, açúcar e água por 15 min.","Combine o bourbon, triple sec, xarope e suco de laranja.","Encha com gelo esmagado."],notes:"",rating:0,servings:"",custom:false},
  {name:"Bramble",categories:["Gim","Shaken"],ingredients:["1½ dose gim","1 dose suco de limão siciliano","1 col. chá açúcar","1 dose rasa licor de amora"],steps:["Bata o gim, limão e açúcar com gelo e coe num copo cheio de gelo.","Despeje o licor de amora por cima.","Decore com amora, limão e hortelã."],notes:"Servir em Double old-fashioned",rating:0,servings:"1",custom:false},
  {name:"Cantaloupe Martini sem álcool",categories:["Não alcóolicos","Shaken"],ingredients:["15ml xarope de manjericão","240ml suco de melão cantaloupe","10ml suco de limão","Sal marinho","Gelo"],steps:["Bata tudo e sirva"],notes:"",rating:0,servings:"",custom:false},
  {name:"Citrus Martini",categories:["Aperol","Vodka","Shaken"],ingredients:["30 ml aperol","50 ml vodka","10 ml suco de limão","1 col. sopa açúcar"],steps:["Gele a taça. Combine tudo na coqueteleira com gelo. Bata bem e faça dupla coagem."],notes:"",rating:0,servings:"",custom:false},
  {name:"Coco e tônica",categories:["Não alcóolicos","Built"],ingredients:["100ml água de coco","70ml água tônica","2 col. sopa açúcar","1 lima da pérsia"],steps:["Macere a lima com açúcar. Adicione gelo, água de coco e complete com tônica."],notes:"",rating:0,servings:"",custom:false},
  {name:"CRF com St-Germain",categories:["Aguardente Velha","St‑Germain","Highball","Built"],ingredients:["40 ml CRF","20 ml St-Germain","20 ml limão siciliano","60 ml água com gás"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"CRF Old Fashioned",categories:["Aguardente Velha","Stirred"],ingredients:["50 ml CRF","1 col. chá açúcar ou xarope","2 dash bitters aromático","casca de laranja"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"CRF Sour",categories:["Aguardente Velha","Sour","Shaken"],ingredients:["50 ml CRF","25 ml suco de limão","15 ml xarope simples","1 clara de ovo (opcional)","gelo"],steps:["Dry shake (sem gelo) se usar clara.","Adicione gelo e bata novamente.","Coe em taça coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Cynar Ginger Spritz",categories:["Cynar","Spritz","Built"],ingredients:["40 ml Cynar","60 ml espumante brut","40 ml tônica de gengibre","Gelo","Casca de laranja"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Daiquiri Parisiense",categories:["Rum","St‑Germain","Sour","Shaken"],ingredients:["40 ml rum branco","20 ml St-Germain","20 ml suco de limão","1 col. chá açúcar"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Dark 'n' Stormy",categories:["Rum Envelhecido","Highball","Buck","Built"],ingredients:["60 ml rum escuro","120 ml cerveja de gengibre","15 ml suco de limão"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"drink de xarope de manjericão com gim",categories:["Gim","Smash","Shaken"],ingredients:["60 ml gim","50 ml xarope de manjericão","suco de 1 limão","suco de 2 pepinos japoneses","Manjericão para decorar"],steps:["Prepare o xarope: água + açúcar (1:1), fervente, desligue e infuse manjericão.","Bata o pepino, coe e reserve.","Combine tudo com gelo e sirva."],notes:"",rating:0,servings:"",custom:false},
  {name:"Dry Martini",categories:["Gim","Vermute seco","Stirred"],ingredients:["2½ partes Gim","½ parte Vermute seco","1 dash licor amargo de laranja","casca de limão"],steps:["Encher copo misturador com gelo.","Adicionar ingredientes e mexer.","Coar em taça gelada. Decorar com limão."],notes:"",rating:0,servings:"",custom:false},
  {name:"Elderflower Aviation",categories:["Gim","Luxardo Maraschino","St‑Germain","Sour","Shaken"],ingredients:["45 ml gin","10 ml St-Germain","10 ml Luxardo Maraschino","20 ml suco de limão"],steps:[],notes:"Uma versão mais floral do Aviation clássico.",rating:0,servings:"",custom:false},
  {name:"Elderflower Daiquiri",categories:["Luxardo Maraschino","Rum","St‑Germain","Sour","Shaken"],ingredients:["60 ml rum branco","15 ml St-Germain","5 ml Maraschino","20 ml suco de limão"],steps:[],notes:"fresco · floral · fundo elegante",rating:0,servings:"",custom:false},
  {name:"Fermentação selvagem (Ginger Bug)",categories:["Ginger Bug"],ingredients:["8 cm gengibre fresco","2 xícaras açúcar branco","2 limões","Água sem cloro"],steps:["Adicione gengibre ralado e açúcar em 250ml água.","Cubra e guarde em local escuro.","Alimente diariamente até borbulhar (2–7 dias)."],notes:"Fermentação selvagem",rating:0,servings:"4L",custom:false},
  {name:"Flor de Cerejeira Fizz",categories:["Espumante","Fizz","Luxardo Maraschino","Spritz","St‑Germain","Built"],ingredients:["20 ml Luxardo","20 ml St-Germain","10 ml limão","completar com água com gás ou espumante"],steps:[],notes:"floral · leve · perfume bom de drink",rating:0,servings:"",custom:false},
  {name:"French 75",categories:["Espumante","Fizz","Gim","Shaken"],ingredients:["30 ml gin","15 ml suco de limão","15 ml xarope simples","prosecco para completar"],steps:["Combine gin, limão e xarope na coqueteleira com gelo.","Agite e coe em taça flute.","Complete com prosecco."],notes:"Cítrico, seco e sofisticado.",rating:4,servings:"",custom:false},
  {name:"Garden Spritz",categories:["Espumante","Luxardo Maraschino","Spritz","St‑Germain","Built"],ingredients:["25 ml St-Germain","10 ml Maraschino","80 ml prosecco","splash de soda"],steps:[],notes:"leve · perfumado · delicado",rating:0,servings:"",custom:false},
  {name:"Gin Fizz",categories:["Gim","Fizz","Shaken"],ingredients:["60 ml Gim","30 ml suco de lima","22 ml xarope simples","Água com gás","1 fatia limão"],steps:["Agite gim, limão e xarope com gelo.","Coe em copo alto.","Complete com água com gás."],notes:"",rating:0,servings:"",custom:false},
  {name:"Gin Tônica",categories:["Gim","Highball","Built"],ingredients:["50 ml Gin","150 ml Tônica","fatia de limão"],steps:["Encha taça balão com gelo.","Adicione o gin.","Complete com tônica pela lateral. Mexa uma vez."],notes:"",rating:3,servings:"",custom:false},
  {name:"Gin Tônica de Bergamota",categories:["Gim","Highball","Built"],ingredients:["50 ml Gin","150 ml Tônica","4 gomos de bergamota","2 gotas Angostura"],steps:[],notes:"",rating:3,servings:"",custom:false},
  {name:"Ginger beer (caseira)",categories:["Ginger Beer"],ingredients:["100g gengibre","200g açúcar","1 limão","1,5L água","6g fermento"],steps:["Ferva a água com gengibre e limão fatiados. Adicione açúcar e cozinhe 15 min.","Coe e transfira para balde fermentador com o fermento dissolvido.","Após 4 dias, transfira com 8g açúcar/litro. Aguarde 2 semanas."],notes:"",rating:4,servings:"",custom:false},
  {name:"Granada Ginger Margarita",categories:["Contreau","Tequila","Sour","Shaken"],ingredients:["60ml tequila","15ml suco de romã","30ml suco de limão","15ml cointreau","15ml cerveja de gengibre"],steps:["Bata tudo com gelo e sirva."],notes:"",rating:0,servings:"",custom:false},
  {name:"Hemingway Daiquiri",categories:["Luxardo Maraschino","Rum","Sour","Shaken"],ingredients:["60 ml rum branco","15 ml Luxardo Maraschino","20 ml suco de limão","15 ml suco de grapefruit"],steps:[],notes:"Criado para Ernest Hemingway, que preferia drinks menos doces.",rating:0,servings:"",custom:false},
  {name:"Highball de Luxardo",categories:["Highball","Luxardo Maraschino","Built"],ingredients:["30 ml Luxardo","10 ml limão Tahiti","água com gás para completar","gelo"],steps:[],notes:"super leve · quase um refrigerante adulto · perfeito pra calor",rating:0,servings:"",custom:false},
  {name:"Hurricane",categories:["Rum Envelhecido","Sling","Shaken"],ingredients:["60 ml rum escuro da Jamaica","30 ml xarope de maracujá","15 ml suco de limão","cereja para decorar"],steps:["Agite tudo com gelo.","Coe em copo alto com gelo picado.","Decore com limão e cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Jamaica Ginger",categories:["Rum Envelhecido","Shaken"],ingredients:["2 partes Rum escuro da Jamaica","1 parte groselha","3 dashes Curaçao de laranja","1 dash bitter"],steps:["Agite com gelo e coe em taça de coquetel."],notes:"",rating:0,servings:"",custom:false},
  {name:"Jasmine (Casa do Porco)",categories:["Campari","Contreau","Gim","Sour","Shaken"],ingredients:["45 ml Gin","15 ml Campari","15 ml Contreau","20 ml suco de limão"],steps:[],notes:"",rating:3,servings:"1",custom:false},
  {name:"Jus dinger",categories:["Não alcóolicos"],ingredients:["500g gengibre","3 polpas maracujá","2 polpas seriguela","2 polpas cajá","Açúcar orgânico","1 ramo hortelã","⅓ noz-moscada","flor de laranjeira"],steps:["Bata o gengibre com água e peneire.","Misture com as polpas e açúcar.","Adicione noz-moscada e flor de laranjeira."],notes:"",rating:0,servings:"6",custom:false},
  {name:"Lavender Gin Sour",categories:["Gim","Sour","Shaken"],ingredients:["50 ml Gin","20ml xarope de lavanda","25ml suco de limão","7,5ml creme de leite fresco","7,5ml xarope de violeta","1 clara de ovo"],steps:["Dry shake por 15s.","Adicione gelo e agite por mais 15s.","Coe em taça coupe."],notes:"",rating:0,servings:"",custom:false},
  {name:"Licor Beirão Sour",categories:["Licor Beirão","Sour","Shaken"],ingredients:["50 ml Licor Beirão","25 ml limão","15 ml açúcar","clara de ovo"],steps:[],notes:"",rating:5,servings:"",custom:false},
  {name:"Manhattan",categories:["Luxardo Maraschino","Vermute Branco","Whisky","Stirred"],ingredients:["60 ml whisky de centeio","30 ml vermute tinto doce","2 dashes bitter","cereja para decorar"],steps:["Mexa com gelo em copo misturador.","Coe em taça de coquetel.","Decore com cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Manhattan (Perfect)",categories:["Vermute Branco","Vermute seco","Whisky","Stirred"],ingredients:["60 ml whisky de centeio","15 ml vermute seco","15 ml vermute doce","2 dashes bitter","cereja e limão para decorar"],steps:["Mexa com gelo. Coe em taça. Decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Maraschino Spritz",categories:["Espumante","Luxardo Maraschino","Spritz","Built"],ingredients:["40 ml Luxardo Maraschino","80 ml espumante brut","40 ml água com gás","rodela de laranja ou limão"],steps:[],notes:"leve · levemente doce · fundo elegante de amêndoa",rating:4,servings:"",custom:false},
  {name:"Margarita",categories:["Contreau","Tequila","Sour","Shaken"],ingredients:["50 ml Tequila","25 ml suco de limão","25 ml Triple Sec","sal na borda (opcional)"],steps:["Agite tudo com gelo.","Coe em taça com borda de sal."],notes:"",rating:4,servings:"",custom:false},
  {name:"Martinez",categories:["Gim","Luxardo Maraschino","Vermute Tinto","Stirred"],ingredients:["45 ml gin","45 ml vermouth rosso","5 ml Luxardo Maraschino","2 dashes Angostura"],steps:["Mexa com gelo e coe."],notes:"O ancestral direto do Martini.",rating:0,servings:"",custom:false},
  {name:"Mojito",categories:["Rum","Smash","Built"],ingredients:["40ml rum","30ml suco de limão","2 col. sobremesa açúcar","10 folhas hortelã","água com gás","Gelo"],steps:["Macere hortelã, açúcar e limão no copo.","Adicione gelo e rum.","Complete com água gaseificada."],notes:"",rating:4,servings:"",custom:false},
  {name:"Mojito Amendoado",categories:["Rum","Smash","Built"],ingredients:["50ml rum branco","10 folhas hortelã","20ml limão taiti","20ml xarope de amêndoa","Tônica de gengibre Britvic"],steps:["Bata tudo exceto a tônica.","Adicione a tônica ao final."],notes:"",rating:5,servings:"",custom:false},
  {name:"Mojito de framboesa",categories:["Rum","Smash","Built"],ingredients:["½ limão","5-6 framboesas","10-12 folhas hortelã","1 col. açúcar","2 doses rum claro","club soda"],steps:["Macere limão, framboesa, hortelã e açúcar.","Adicione gelo e rum. Complete com soda."],notes:"",rating:0,servings:"",custom:false},
  {name:"Moscow Mule",categories:["Vodka","Highball","Buck","Built"],ingredients:["60ml Vodka","20ml suco de limão","90ml cerveja de gengibre","1 rodela limão"],steps:["Encha o caneco com gelo.","Adicione vodka e limão.","Complete com ginger beer. Decore."],notes:"Copo de cobre",rating:0,servings:"",custom:false},
  {name:"Mr. Grinch",categories:["Tequila","Shaken"],ingredients:["60ml tequila ou mezcal","30ml suco de pepino","15ml xarope de jalapeño","10ml suco de limão"],steps:["Bata tudo com gelo. Sirva com hortelã."],notes:"",rating:0,servings:"",custom:false},
  {name:"Negroni",categories:["Campari","Gim","Vermute Tinto","Stirred"],ingredients:["30 ml Gin","30 ml Campari","30 ml Vermute tinto"],steps:["Adicione gelo no copo.","Adicione os três ingredientes em partes iguais.","Mexa e decore com casca de laranja."],notes:"",rating:4,servings:"1",custom:false},
  {name:"Negroni Sbagliato",categories:["Campari","Espumante","Spritz","Vermute Tinto","Built"],ingredients:["30 ml Campari","30 ml vermouth rosso","prosecco para completar"],steps:[],notes:"Amargo, herbáceo e mais leve que o Negroni tradicional.",rating:3,servings:"",custom:false},
  {name:"Old Fashioned",categories:["Whisky","Stirred"],ingredients:["60 ml Bourbon","2 dashes Bitter","1 cubo açúcar","casca de laranja"],steps:["Macere açúcar e bitter no copo.","Adicione gelo e bourbon.","Mexa e decore com laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Pisco Elderflower Sour",categories:["Pisco","St‑Germain","Sour","Shaken"],ingredients:["50 ml pisco","20 ml St-Germain","20 ml limão","clara de ovo","angostura"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Pisco Sour",categories:["Pisco","Sour","Shaken"],ingredients:["45mL pisco","30mL suco limão Taiti","20mL xarope de açúcar","1 clara","Gelo","Bitter Angostura"],steps:["Agite tudo por 30-45s.","Coe e pingue 1-2 gotas de bitter."],notes:"",rating:5,servings:"",custom:false},
  {name:"Sazerac",categories:["Conhaque","Stirred"],ingredients:["60 ml Conhaque","5 ml xarope simples","3 dashes Absinto","2 dashes Peychaud's bitters","casca de limão"],steps:["Passe o absinto no copo e descarte o excesso.","Adicione conhaque, xarope e bitters com gelo. Mexa.","Coe no copo preparado. Decore com limão."],notes:"",rating:0,servings:"",custom:false},
  {name:"SAZERAC por Kennedy Nascimento",categories:["Conhaque","Whisky","Stirred"],ingredients:["30 ml cognac VSOP","30 ml bourbon ou rye","1 torrão açúcar","Spray de Absinto","4 dashes Peychaud's","2 dashes angostura","Zest limão siciliano"],steps:["Suje o copo com absinto e reserve com gelo.","Macere açúcar com bitters no mixing glass. Adicione cognac e mexa.","Retire o gelo, verta o drink. Decore com zest."],notes:"",rating:0,servings:"",custom:false},
  {name:"Sevilla Sour",categories:["Gim","St‑Germain","Sour","Shaken"],ingredients:["50 ml Flor de Sevilla","20 ml St-Germain","25 ml limão siciliano","10 ml xarope simples","clara de ovo (opcional)"],steps:[],notes:"",rating:3,servings:"",custom:false},
  {name:"Shanksjillo",categories:["Contreau","Pisco","Whisky","Shaken"],ingredients:["1 dose Shanky's","1 dose Contreau","1 xícara café expresso"],steps:["Bata bem até espumar."],notes:"",rating:5,servings:"",custom:false},
  {name:"Smoked Apple Whiskey Tonic",categories:["Jack Apple","Whisky","Highball","Built"],ingredients:["60ml Apple Whiskey (Jack Daniel's)","120ml suco de maçã","Água Tônica","Canela e alecrim"],steps:["Defume o copo com canela por 1-2 min.","Adicione gelo, whiskey, suco de maçã e tônica."],notes:"",rating:0,servings:"",custom:false},
  {name:"Smokey Martini",categories:["Gim","Stirred"],ingredients:["60 ml Gin","toque de whisky defumado","raspa de limão"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"Spring Martini",categories:["Gim","Luxardo Maraschino","St‑Germain","Stirred"],ingredients:["60 ml gin","10 ml St-Germain","5 ml Maraschino"],steps:[],notes:"",rating:0,servings:"",custom:false},
  {name:"St‑Germain Hugo Spritz",categories:["St‑Germain","Spritz","Espumante","Built"],ingredients:["40 ml St‑Germain","60 ml espumante","60 ml água com gás","8-10 folhas hortelã","1 fatia limão taiti"],steps:[],notes:"",rating:4,servings:"",custom:false},
  {name:"St‑Germain Spritz",categories:["St‑Germain","Spritz","Espumante","Built"],ingredients:["40 ml St‑Germain","60 ml espumante brut","60 ml água com gás","casca limão siciliano"],steps:[],notes:"",rating:3,servings:"",custom:false},
  {name:"The Clover Club",categories:["Gim","Sour","Shaken"],ingredients:["45 ml Gin","20 ml suco de limão","15 ml xarope simples","4 framboesas","1 clara de ovo"],steps:["Agite tudo sem gelo por 15s.","Adicione gelo e agite por mais 15s.","Coe sem gelo."],notes:"",rating:0,servings:"1",custom:false},
  {name:"The Tom Collins (20's)",categories:["Gim","Collins","Vermute Branco","Built"],ingredients:["45ml Gin","suco de limão","xarope de açúcar","2/3 dose Martini Branco","água com gás","Angostura amarela","1 fatia pepino"],steps:["Combine gin, limão e açúcar com gelo.","Adicione o Martini.","Complete com água com gás, pepino e angostura."],notes:"",rating:5,servings:"",custom:false},
  {name:"Whiskey Mule de Romã",categories:["Whisky","Highball","Buck","Built"],ingredients:["60ml whiskey","15ml suco de limão","15ml grenadine de romã","3 gotas bitter de laranja","cerveja de gengibre"],steps:["Misture tudo e complete com ginger beer."],notes:"",rating:0,servings:"",custom:false},
  {name:"Whiskey Sour",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml Uísque","30 ml suco de lima","22 ml xarope simples","1 clara de ovo","alecrim tostado"],steps:["Agite com gelo. Coe em rocks cheio de gelo.","Decore com cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"White Russian de abóbora",categories:["Vodka","Built"],ingredients:["60ml vodka","60ml kahlua","30ml creme batido com geleia de abóbora"],steps:["Misture tudo."],notes:"",rating:0,servings:"",custom:false},
  // — CLÁSSICOS NOVOS —
  {name:"Daiquiri",categories:["Rum","Sour","Shaken"],ingredients:["60 ml rum branco","30 ml suco de limão fresco","22 ml xarope simples"],steps:["Combine tudo na coqueteleira com gelo.","Agite vigorosamente por 15s.","Coe em taça coupe gelada."],notes:"Simples e brilhante. A qualidade do rum faz toda a diferença.",rating:5,servings:"1",custom:false},
  {name:"Cosmopolitan",categories:["Vodka","Sour","Shaken"],ingredients:["45 ml vodka","15 ml Cointreau","30 ml suco de cranberry","15 ml suco de limão"],steps:["Combine tudo com gelo.","Agite e coe em taça. Decore com casca de laranja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Gimlet",categories:["Gim","Sour","Shaken"],ingredients:["60 ml gin","20 ml cordial de limão","10 ml suco de limão fresco"],steps:["Combine na coqueteleira com gelo.","Agite e coe em taça coupe."],notes:"Com cordial Rose's fica mais doce. Com suco fresco fica mais vivo.",rating:0,servings:"",custom:false},
  {name:"Americano",categories:["Campari","Vermute Tinto","Highball","Built"],ingredients:["30 ml Campari","30 ml vermute tinto doce","Água com gás","Casca de laranja"],steps:["Adicione Campari e vermute num copo com gelo.","Complete com água com gás.","Decore com casca de laranja."],notes:"O avô do Negroni. Mais leve e acessível.",rating:0,servings:"",custom:false},
  {name:"Boulevardier",categories:["Campari","Whisky","Vermute Tinto","Stirred"],ingredients:["45 ml bourbon","30 ml Campari","30 ml vermute tinto doce"],steps:["Mexa tudo com gelo por 30s.","Coe em taça ou rocks. Decore com laranja."],notes:"O Negroni com bourbon. Mais encorpado e quente.",rating:0,servings:"",custom:false},
  {name:"Rob Roy",categories:["Whisky","Vermute Tinto","Stirred"],ingredients:["60 ml Scotch whisky","30 ml vermute tinto doce","2 dashes Angostura","cereja marrasquino"],steps:["Mexa com gelo e coe em taça. Decore com cereja."],notes:"Manhattan escocês.",rating:0,servings:"",custom:false},
  {name:"Vieux Carré",categories:["Conhaque","Whisky","Vermute Tinto","Stirred"],ingredients:["22 ml cognac","22 ml rye whiskey","22 ml vermute tinto doce","1 dash Angostura","1 dash Peychaud's","5 ml Bénédictine"],steps:["Mexa tudo com gelo.","Coe em rocks com gelo. Decore com laranja."],notes:"Um clássico de Nova Orleans. Complexo e equilibrado.",rating:0,servings:"",custom:false},
  {name:"Amaretto Sour",categories:["Amaretto","Sour","Shaken"],ingredients:["60 ml Amaretto","30 ml suco de limão","20 ml bourbon","1 clara de ovo","2 dashes Angostura"],steps:["Dry shake por 15s.","Adicione gelo e agite por mais 15s.","Coe em rocks. Decore com cereja e laranja."],notes:"O bourbon equilibra o doce do Amaretto.",rating:0,servings:"",custom:false},
  {name:"New York Sour",categories:["Whisky","Sour","Shaken"],ingredients:["60 ml bourbon ou rye","30 ml suco de limão","22 ml xarope simples","1 clara de ovo","float de vinho tinto seco"],steps:["Dry shake tudo exceto o vinho.","Adicione gelo e agite. Coe em rocks.","Despeje o vinho tinto sobre o dorso de uma colher para criar o float."],notes:"O float de vinho cria uma camada visual impressionante.",rating:0,servings:"",custom:false},
  {name:"Paloma",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","15 ml suco de limão","suco de toranja para completar","sal na borda (opcional)"],steps:["Prepare a borda com sal.","Adicione gelo, tequila e limão.","Complete com suco de toranja. Decore."],notes:"No México é mais popular que a Margarita.",rating:0,servings:"",custom:false},
  {name:"Tequila Sunrise",categories:["Tequila","Highball","Built"],ingredients:["60 ml tequila","120 ml suco de laranja","15 ml grenadine"],steps:["Encha com gelo. Adicione tequila e suco de laranja.","Despeje a grenadine devagar pela lateral — ela afunda criando o degradê."],notes:"Não mexa depois da grenadine — o efeito é o ponto.",rating:0,servings:"",custom:false},
  {name:"Piña Colada",categories:["Rum","Shaken"],ingredients:["60 ml rum branco","90 ml suco de abacaxi","45 ml creme de coco"],steps:["Agite tudo com gelo e coe.","Ou bata no liquidificador para a versão frozen.","Decore com abacaxi e cereja."],notes:"",rating:0,servings:"",custom:false},
  {name:"Mai Tai",categories:["Rum","Sour","Shaken"],ingredients:["60 ml rum envelhecido","15 ml curaçao laranja","15 ml orgeat (xarope de amêndoa)","30 ml suco de limão"],steps:["Agite tudo com gelo.","Coe em rocks com gelo. Decore com hortelã e cereja."],notes:"Um clássico tiki. O orgeat é indispensável.",rating:0,servings:"",custom:false},
  {name:"Jungle Bird",categories:["Rum Envelhecido","Campari","Highball","Shaken"],ingredients:["45 ml rum escuro","22 ml Campari","15 ml Luxardo Maraschino","15 ml suco de limão","45 ml suco de abacaxi"],steps:["Agite tudo com gelo.","Coe em rocks. Decore com abacaxi."],notes:"O único clássico tiki com amaro. Surpreendente.",rating:0,servings:"",custom:false},
  {name:"Irish Coffee",categories:["Whisky","Hot"],ingredients:["40 ml Irish whiskey","120 ml café quente","15 ml xarope simples","creme de leite levemente batido"],steps:["Aqueça a taça. Adicione whiskey e xarope.","Complete com café quente e mexa.","Despeje o creme por cima passando pelo dorso de uma colher."],notes:"O creme deve flutuar. Beba o café através do creme.",rating:0,servings:"",custom:false},
  {name:"Hot Toddy",categories:["Whisky","Hot"],ingredients:["60 ml whisky","25 ml mel","25 ml suco de limão","150 ml água quente","pau de canela","cravos"],steps:["Coloque mel, limão e especiarias na caneca.","Adicione o whisky.","Complete com água quente e mexa."],notes:"Perfeito para dias frios.",rating:0,servings:"",custom:false},
  {name:"Black Russian",categories:["Vodka","Stirred"],ingredients:["50 ml vodka","25 ml Kahlúa"],steps:["Coloque gelo em rocks.","Adicione vodka e Kahlúa. Mexa."],notes:"Com creme de leite vira White Russian.",rating:0,servings:"",custom:false},
  {name:"Godfather",categories:["Whisky","Stirred"],ingredients:["45 ml Scotch whisky","25 ml Amaretto"],steps:["Coloque gelo em rocks.","Adicione e mexa suavemente."],notes:"Com vodka vira Godmother.",rating:0,servings:"",custom:false},
  {name:"Ramos Gin Fizz",categories:["Gim","Fizz","Shaken"],ingredients:["60 ml gin","15 ml suco de limão","15 ml suco de lima","30 ml creme de leite","1 clara de ovo","22 ml xarope simples","3 gotas água de flor de laranjeira","soda"],steps:["Dry shake TODOS os ingredientes por 2 minutos (sim, 2 min!).","Adicione gelo e agite por mais 1 minuto.","Coe em Collins sem gelo. Complete com soda."],notes:"O shake longo é o segredo da textura aerada.",rating:0,servings:"",custom:false},
  {name:"Vodka Tônica",categories:["Vodka","Highball","Built"],ingredients:["50 ml vodka","150 ml água tônica","rodela de limão"],steps:["Encha com gelo. Adicione vodka.","Complete com tônica pela lateral. Decore."],notes:"",rating:0,servings:"",custom:false},
  {name:"Caipirinha",categories:["Cachaça","Sour","Built"],ingredients:["60 ml cachaça","1 limão taiti","2 col. chá açúcar","gelo picado"],steps:["Corte o limão em 4 pedaços e macere com açúcar no copo.","Adicione gelo picado e a cachaça.","Mexa vigorosamente."],notes:"A proporção do limão e açúcar é o segredo.",rating:0,servings:"",custom:false},
];

function getTheme(cats=[]) {
  for (const s of STYLE_PRIORITY) if (cats.includes(s)) return TYPE_THEME[s];
  return TYPE_THEME["_default"];
}
function Stars({n,color}){
  if(!n)return null;
  return <span style={{fontSize:11,color:color||"#C8A96E"}}>{"★".repeat(n)}<span style={{opacity:.2}}>{"★".repeat(5-n)}</span></span>;
}

// ─── FORM ─────────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name:"", ingredients:[""], steps:[""], notes:"", rating:0, servings:"", categories:[] };

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
    setScanning(true); setScanErr(null);
    const preview = URL.createObjectURL(file);
    setPreviewImg(preview);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const mediaType = file.type || "image/jpeg";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerously-allow-browser": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `Você é um bartender que lê receitas de drinks em imagens. Extraia as informações e retorne APENAS um JSON com as chaves: "name" (string), "ingredients" (array de strings), "steps" (array de strings, cada passo separado), "notes" (string, pode ser vazio), "servings" (string, pode ser vazio). Sem texto fora do JSON. Sem markdown. Se alguma informação não estiver na imagem, deixe como string vazia ou array vazio.`,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: "Extraia a receita desta imagem e retorne o JSON." }
            ]
          }]
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      setForm(f => ({
        ...f,
        name: parsed.name || f.name,
        ingredients: parsed.ingredients?.length ? parsed.ingredients : f.ingredients,
        steps: parsed.steps?.length ? parsed.steps : f.steps,
        notes: parsed.notes || f.notes,
        servings: parsed.servings || f.servings,
      }));
    } catch (e) {
      setScanErr("Erro: " + (e?.message || "Não consegui ler a receita. Tente uma imagem mais nítida."));
    }
    setScanning(false);
  }, []);

  const suggestCategories = useCallback(async () => {
    if (!form.ingredients.filter(Boolean).length && !form.name) return;
    setSuggesting(true); setSuggErr(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerously-allow-browser":"true"},
        body: JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:400,
          system:`Você é um bartender especialista em classificação de coquetéis. Analise o drink e retorne APENAS um JSON com as chaves "styles" e "spirits". Sem texto fora do JSON.
Estilos possíveis: ${STYLE_PRIORITY.join(", ")}
Spirits possíveis: ${[...SPIRIT_CATS].join(", ")}
Retorne apenas os que realmente se aplicam. Exemplo: {"styles":["Sour","Shaken"],"spirits":["Gim","Luxardo Maraschino"]}`,
          messages:[{role:"user", content:`Nome: ${form.name}\nIngredientes:\n${form.ingredients.filter(Boolean).join("\n")}${form.steps.filter(Boolean).length ? `\nPreparo:\n${form.steps.filter(Boolean).join("\n")}` : ""}`}],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      const suggested = [...(parsed.styles||[]), ...(parsed.spirits||[])];
      setField("categories", [...new Set([...form.categories, ...suggested])]);
    } catch { setSuggErr("Erro ao sugerir. Tente novamente."); }
    setSuggesting(false);
  }, [form.name, form.ingredients, form.steps]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, ingredients: form.ingredients.filter(Boolean), steps: form.steps.filter(Boolean), custom: true, id: initial?.id || Date.now() });
  };

  const inp = (extra={}) => ({ style:{ width:"100%", background:"rgba(240,235,225,0.05)", border:"1px solid rgba(240,235,225,0.1)", borderRadius:4, padding:"8px 11px", color:"#F0EBE1", fontSize:13, outline:"none", ...extra.style }, ...extra });
  const theme = getTheme(form.categories);

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20,backdropFilter:"blur(10px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0E0E0E",border:"1px solid rgba(240,235,225,0.1)",borderRadius:10,width:"100%",maxWidth:620,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{padding:"24px 28px 30px"}}>
          <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])scanPhoto(e.target.files[0]);e.target.value="";}} />

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:"#F0EBE1"}}>
              {initial ? "Editar receita" : "Nova receita"}
            </h2>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>photoRef.current?.click()} disabled={scanning} style={{padding:"6px 14px",borderRadius:5,background:"rgba(240,235,225,0.06)",border:"1px solid rgba(240,235,225,0.12)",color:scanning?"#C8A96E":"rgba(240,235,225,0.5)",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                {scanning ? <>⏳ lendo receita…</> : <>📷 importar foto</>}
              </button>
              <button onClick={onClose} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:"50%",width:30,height:30,color:"rgba(240,235,225,0.4)",fontSize:16,cursor:"pointer"}}>×</button>
            </div>
          </div>

          {previewImg && (
            <div style={{marginBottom:16,borderRadius:7,overflow:"hidden",border:"1px solid rgba(240,235,225,0.08)",position:"relative"}}>
              <img src={previewImg} alt="receita" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block",opacity:scanning?0.5:1,transition:"opacity .3s"}}/>
              {scanning && (
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
                  <div style={{fontSize:28}}>🔍</div>
                  <div style={{fontSize:12,color:"#C8A96E",letterSpacing:1.5,textTransform:"uppercase"}}>Analisando com IA…</div>
                </div>
              )}
              {!scanning && (
                <button onClick={()=>setPreviewImg(null)} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.65)",border:"none",borderRadius:"50%",width:24,height:24,color:"rgba(240,235,225,0.7)",fontSize:13,cursor:"pointer"}}>×</button>
              )}
            </div>
          )}
          {scanErr && <div style={{marginBottom:14,padding:"9px 13px",borderRadius:5,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",color:"#F87171",fontSize:12}}>{scanErr}</div>}

          {/* Nome */}
          <label style={labelSt}>Nome do drink</label>
          <input {...inp()} value={form.name} onChange={e=>setField("name",e.target.value)} placeholder="ex: Gin Sour de Lavanda" style={{...inp().style,marginBottom:18,fontSize:15}} />

          {/* Ingredientes */}
          <label style={labelSt}>Ingredientes</label>
          {form.ingredients.map((ing,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
              <input {...inp()} value={ing} onChange={e=>setListItem("ingredients",i,e.target.value)} placeholder={`Ingrediente ${i+1}`} />
              {form.ingredients.length>1 && <button onClick={()=>removeListItem("ingredients",i)} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:4,color:"rgba(240,235,225,0.3)",width:32,flexShrink:0,cursor:"pointer",fontSize:14}}>×</button>}
            </div>
          ))}
          <button onClick={()=>addListItem("ingredients")} style={addBtnSt}>+ ingrediente</button>

          {/* Categorias com IA */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:20,marginBottom:10}}>
            <label style={{...labelSt,margin:0}}>Categorias</label>
            <button onClick={suggestCategories} disabled={suggesting} style={{padding:"3px 12px",borderRadius:20,fontSize:10,background:"rgba(200,169,110,0.13)",border:"1px solid rgba(200,169,110,0.4)",color:"#C8A96E",cursor:"pointer",letterSpacing:.5}}>
              {suggesting ? "sugerindo…" : "✦ sugerir com IA"}
            </button>
            {suggErr && <span style={{fontSize:11,color:"#F87171"}}>{suggErr}</span>}
          </div>

          <div style={{marginBottom:6}}>
            <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.25)",marginBottom:6}}>Família / Técnica</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {STYLE_PRIORITY.map(s=>{
                const th=TYPE_THEME[s]||TYPE_THEME["_default"];
                const on=form.categories.includes(s);
                return <button key={s} onClick={()=>toggleCat(s)} style={{padding:"3px 10px",borderRadius:20,fontSize:11,background:on?th.accent+"22":"rgba(240,235,225,0.04)",border:`1px solid ${on?th.accent+"66":"rgba(240,235,225,0.08)"}`,color:on?th.label:"rgba(240,235,225,0.35)",cursor:"pointer",transition:"all .12s"}}>{s}</button>;
              })}
            </div>
            <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"rgba(240,235,225,0.25)",marginBottom:6}}>Spirits / Ingredientes principais</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {ALL_SPIRIT_OPTIONS.map(s=>{
                const on=form.categories.includes(s);
                return <button key={s} onClick={()=>toggleCat(s)} style={{padding:"3px 10px",borderRadius:20,fontSize:11,background:on?"rgba(200,169,110,0.15)":"rgba(240,235,225,0.04)",border:`1px solid ${on?"rgba(200,169,110,0.5)":"rgba(240,235,225,0.08)"}`,color:on?"#C8A96E":"rgba(240,235,225,0.3)",cursor:"pointer",transition:"all .12s"}}>{s}</button>;
              })}
            </div>
          </div>

          {/* Modo de preparo */}
          <label style={{...labelSt,marginTop:18}}>Modo de preparo</label>
          {form.steps.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"flex-start"}}>
              <div style={{width:26,height:26,borderRadius:"50%",border:`1px solid ${theme.border}55`,color:theme.label,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:5}}>{i+1}</div>
              <textarea {...inp()} value={s} onChange={e=>setListItem("steps",i,e.target.value)} placeholder={`Passo ${i+1}`} rows={2} style={{...inp().style,resize:"none",lineHeight:1.5}} />
              {form.steps.length>1 && <button onClick={()=>removeListItem("steps",i)} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:4,color:"rgba(240,235,225,0.3)",width:32,height:32,flexShrink:0,cursor:"pointer",fontSize:14,marginTop:2}}>×</button>}
            </div>
          ))}
          <button onClick={()=>addListItem("steps")} style={addBtnSt}>+ passo</button>

          {/* Notas e detalhes */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:18}}>
            <div>
              <label style={labelSt}>Notas</label>
              <textarea {...inp()} value={form.notes} onChange={e=>setField("notes",e.target.value)} placeholder="observações, dicas…" rows={2} style={{...inp().style,resize:"none",lineHeight:1.5}} />
            </div>
            <div>
              <label style={labelSt}>Rende</label>
              <input {...inp()} value={form.servings} onChange={e=>setField("servings",e.target.value)} placeholder="ex: 1 dose" style={{...inp().style,marginBottom:10}} />
              <label style={labelSt}>Rating</label>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setField("rating",form.rating===n?0:n)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:n<=form.rating?"#C8A96E":"rgba(240,235,225,0.15)",transition:"color .1s"}}>★</button>
                ))}
              </div>
            </div>
          </div>

          {/* Salvar */}
          <div style={{display:"flex",gap:10,marginTop:24,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{padding:"9px 20px",borderRadius:5,background:"none",border:"1px solid rgba(240,235,225,0.1)",color:"rgba(240,235,225,0.4)",cursor:"pointer",fontSize:13}}>Cancelar</button>
            <button onClick={handleSave} disabled={!form.name.trim()} style={{padding:"9px 24px",borderRadius:5,background:"rgba(200,169,110,0.18)",border:"1px solid rgba(200,169,110,0.5)",color:"#C8A96E",cursor:"pointer",fontSize:13,fontWeight:600,opacity:form.name.trim()?1:.4}}>
              {initial ? "Salvar alterações" : "Adicionar receita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelSt = { display:"block", fontSize:9, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(240,235,225,0.3)", fontWeight:700, marginBottom:7 };
const addBtnSt = { marginTop:4, padding:"5px 12px", borderRadius:4, background:"none", border:"1px solid rgba(240,235,225,0.1)", color:"rgba(240,235,225,0.35)", cursor:"pointer", fontSize:11, letterSpacing:.5 };

// ─── CARD ─────────────────────────────────────────────────────────────────────
function DrinkCard({recipe,isFav,onFav,isTried,onTried,hasAll,onClick}){
  const theme=getTheme(recipe.categories);
  const styleTag=recipe.categories.find(c=>STYLE_CATS.has(c));
  const technique=["Stirred","Shaken","Built"].find(t=>recipe.categories.includes(t));
  const [hov,setHov]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:hov?theme.bg+"ff":theme.bg+"bb",border:`1px solid ${hov?theme.border:theme.border+"44"}`,borderRadius:8,padding:"17px 15px 13px 15px",cursor:"pointer",position:"relative",overflow:"hidden",transition:"all .17s ease",transform:hov?"translateY(-3px)":"none",boxShadow:hov?`0 10px 36px ${theme.accent}12`:"none",display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${hasAll?"#4ADE80":theme.accent},transparent)`,opacity:hov?1:.4,transition:"opacity .2s"}}/>
      <button onClick={e=>{e.stopPropagation();onTried();}} title={isTried?"Marcar como não provado":"Marcar como provado"} style={{position:"absolute",top:7,left:7,background:"none",border:"none",fontSize:12,color:isTried?"#4ADE80":"rgba(255,255,255,0.12)",cursor:"pointer",padding:3,lineHeight:1,transition:"color .15s"}}>
        {isTried?"✓":"○"}
      </button>
      <button onClick={e=>{e.stopPropagation();onFav();}} style={{position:"absolute",top:9,right:9,background:"none",border:"none",fontSize:13,color:isFav?theme.accent:"rgba(255,255,255,0.1)",cursor:"pointer",padding:4,filter:isFav?`drop-shadow(0 0 5px ${theme.accent})`:"none"}}>{isFav?"♥":"♡"}</button>
      {recipe.custom && <div title="Receita sua" style={{position:"absolute",top:9,right:32,width:5,height:5,borderRadius:"50%",background:"#C8A96E",opacity:.7}}/>}
      {hasAll && <div style={{position:"absolute",bottom:8,left:9,fontSize:8,letterSpacing:1,textTransform:"uppercase",color:"#4ADE80",opacity:.7}}>tenho tudo</div>}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:9,paddingLeft:16}}>
        {styleTag&&<span style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:700,color:theme.label,opacity:.8}}>{styleTag}</span>}
        {technique&&styleTag!==technique&&<span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(240,235,225,0.22)"}}>· {technique}</span>}
      </div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,lineHeight:1.15,color:"#F0EBE1",marginBottom:8,paddingRight:18}}>{recipe.name}</div>
      {recipe.rating>0&&<div style={{marginBottom:8}}><Stars n={recipe.rating} color={theme.accent}/></div>}
      <div style={{fontSize:11,color:"rgba(240,235,225,0.27)",lineHeight:1.5,marginTop:"auto",paddingBottom:hasAll?14:0}}>{recipe.ingredients.slice(0,3).join(" · ")}{recipe.ingredients.length>3&&" · …"}</div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({recipe,onClose,isFav,onFav,isTried,onTried,onRating,onEdit,onDelete}){
  const theme=getTheme(recipe.categories);
  const [steps,setSteps]=useState(recipe.steps);
  const [generating,setGenerating]=useState(false);
  const [genErr,setGenErr]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [hoverStar,setHoverStar]=useState(0);

  const generateSteps=useCallback(async()=>{
    setGenerating(true);setGenErr(null);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerously-allow-browser":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:800,system:"Você é um bartender experiente. Responda APENAS com array JSON de strings, cada string sendo um passo do modo de preparo. Sem texto fora do JSON.",messages:[{role:"user",content:`Drink: "${recipe.name}"\nIngredientes:\n${recipe.ingredients.join("\n")}${recipe.notes?`\nNota: ${recipe.notes}`:""}`}]})});
      const data=await res.json();
      setSteps(JSON.parse((data.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim()));
    }catch{setGenErr("Erro ao gerar. Tente novamente.");}
    setGenerating(false);
  },[recipe]);

  const styleTags=recipe.categories.filter(c=>STYLE_CATS.has(c));
  const spiritTags=recipe.categories.filter(c=>SPIRIT_CATS.has(c));

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20,backdropFilter:"blur(10px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(150deg,${theme.bg} 0%,#0A0A0A 55%)`,border:`1px solid ${theme.border}44`,borderRadius:10,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto",boxShadow:`0 0 80px ${theme.accent}0a`}}>
        <button onClick={onClose} style={{position:"sticky",float:"right",top:14,marginRight:14,marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:"50%",border:`1px solid ${theme.border}33`,background:"#0A0A0A",color:"rgba(240,235,225,0.4)",fontSize:16,cursor:"pointer"}}>×</button>
        <div style={{padding:"20px 28px 32px",clear:"both"}}>
          <div style={{height:2,background:`linear-gradient(90deg,${theme.accent},${theme.accent}00)`,marginBottom:20,borderRadius:2,width:"50%"}}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
            {styleTags.map(c=><span key={c} style={{padding:"2px 10px",borderRadius:20,fontSize:10,letterSpacing:1,background:(TYPE_THEME[c]?.accent||"#888")+"18",border:`1px solid ${(TYPE_THEME[c]?.border||"#888")+"55"}`,color:TYPE_THEME[c]?.label||"rgba(240,235,225,0.5)",fontWeight:600}}>{c}</span>)}
            {spiritTags.map(c=><span key={c} style={{padding:"2px 10px",borderRadius:20,fontSize:10,letterSpacing:.5,background:"rgba(200,169,110,0.08)",border:"1px solid rgba(200,169,110,0.25)",color:"rgba(200,169,110,0.8)"}}>{c}</span>)}
            {recipe.custom&&<span style={{padding:"2px 10px",borderRadius:20,fontSize:10,background:"rgba(200,169,110,0.08)",border:"1px solid rgba(200,169,110,0.25)",color:"rgba(200,169,110,0.6)"}}>✦ sua receita</span>}
          </div>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:600,lineHeight:1.1,color:"#F0EBE1",margin:0}}>{recipe.name}</h2>
            <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0,marginLeft:12}}>
              {recipe.custom&&<button onClick={onEdit} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:4,padding:"4px 10px",color:"rgba(240,235,225,0.4)",fontSize:11,cursor:"pointer"}}>editar</button>}
              <button onClick={onFav} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:isFav?theme.accent:"rgba(255,255,255,0.15)",filter:isFav?`drop-shadow(0 0 8px ${theme.accent})`:"none",transition:"all .2s"}}>{isFav?"♥":"♡"}</button>
            </div>
          </div>

          {/* Rating rápido + Já provei */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onMouseEnter={()=>setHoverStar(n)} onMouseLeave={()=>setHoverStar(0)} onClick={()=>onRating(n===recipe.rating?0:n)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:n<=(hoverStar||recipe.rating)?theme.accent:"rgba(240,235,225,0.12)",transition:"color .1s",padding:"0 1px"}}>★</button>
              ))}
            </div>
            <button onClick={onTried} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:isTried?"rgba(74,222,128,0.1)":"rgba(240,235,225,0.04)",border:`1px solid ${isTried?"rgba(74,222,128,0.4)":"rgba(240,235,225,0.1)"}`,color:isTried?"#4ADE80":"rgba(240,235,225,0.35)",fontSize:11,cursor:"pointer",transition:"all .15s"}}>
              <span style={{fontSize:14}}>{isTried?"✓":"○"}</span> {isTried?"Já provei":"Marcar como provado"}
            </button>
          </div>

          {recipe.servings&&<div style={{fontSize:12,color:"rgba(240,235,225,0.28)",fontStyle:"italic",marginBottom:18}}>rende {recipe.servings}</div>}

          <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:theme.accent,opacity:.6,marginBottom:10}}>Ingredientes</div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:26}}>
            {recipe.ingredients.map((ing,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"baseline"}}>
                <div style={{width:4,height:4,borderRadius:"50%",background:theme.accent,opacity:.5,flexShrink:0,marginTop:8}}/>
                <span style={{fontSize:14,color:"rgba(240,235,225,0.75)",lineHeight:1.55}}>{ing}</span>
              </div>
            ))}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:theme.accent,opacity:.6}}>Modo de preparo</div>
            {steps.length===0&&!generating&&<button onClick={generateSteps} style={{padding:"3px 12px",borderRadius:20,fontSize:10,background:theme.accent+"16",border:`1px solid ${theme.accent}44`,color:theme.accent,cursor:"pointer"}}>✦ gerar com IA</button>}
            {generating&&<span style={{fontSize:11,color:theme.accent,opacity:.5,fontStyle:"italic"}}>gerando…</span>}
          </div>
          {genErr&&<p style={{fontSize:12,color:"#F87171",marginBottom:12}}>{genErr}</p>}
          {steps.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:13,marginBottom:26}}>
              {steps.map((s,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"26px 1fr",gap:12,alignItems:"start"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",border:`1px solid ${theme.border}`,color:theme.label,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                  <div style={{fontSize:14,color:"rgba(240,235,225,0.7)",lineHeight:1.7,paddingTop:3}}>{s}</div>
                </div>
              ))}
            </div>
          ):!generating&&(
            <div style={{padding:"18px 0 26px",textAlign:"center",color:"rgba(240,235,225,0.18)",fontSize:13,fontStyle:"italic"}}>
              Sem modo de preparo cadastrado.<br/><span style={{fontSize:11}}>Use o botão acima para gerar automaticamente.</span>
            </div>
          )}
          {recipe.notes&&(
            <div style={{background:theme.accent+"08",borderLeft:`2px solid ${theme.accent}44`,padding:"12px 15px",borderRadius:"0 5px 5px 0",marginBottom:recipe.custom?20:0}}>
              <div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:theme.accent,opacity:.5,marginBottom:5}}>Nota</div>
              <div style={{fontSize:13,color:"rgba(240,235,225,0.48)",lineHeight:1.7,fontStyle:"italic"}}>{recipe.notes}</div>
            </div>
          )}
          {recipe.custom&&(
            <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(240,235,225,0.06)"}}>
              {!confirmDelete?(
                <button onClick={()=>setConfirmDelete(true)} style={{background:"none",border:"1px solid rgba(239,68,68,0.2)",borderRadius:4,padding:"6px 14px",color:"rgba(239,68,68,0.5)",fontSize:11,cursor:"pointer"}}>excluir receita</button>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:12,color:"rgba(240,235,225,0.4)"}}>Tem certeza?</span>
                  <button onClick={onDelete} style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:4,padding:"5px 14px",color:"#F87171",fontSize:11,cursor:"pointer"}}>sim, excluir</button>
                  <button onClick={()=>setConfirmDelete(false)} style={{background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:4,padding:"5px 12px",color:"rgba(240,235,225,0.35)",fontSize:11,cursor:"pointer"}}>cancelar</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function SidebarContent({sidebarTab,setSidebarTab,allRecipes,activeStyle,setActiveStyle,allSpirits,visibleSpirits,owned,toggleOwned,filterMode,setFilterMode,activeSpirits,toggleSpirit,spiritSearch,setSpiritSearch,hasFilters,clearAll,customSpirits,setCustomSpirits}){
  const [newSpirit,setNewSpirit]=useState("");
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",borderBottom:"1px solid rgba(240,235,225,0.07)",marginBottom:16}}>
        {["família","spirit"].map(t=>(
          <button key={t} onClick={()=>setSidebarTab(t)} style={{flex:1,padding:"8px 0",background:"none",border:"none",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,color:sidebarTab===t?"#C8A96E":"rgba(240,235,225,0.22)",borderBottom:sidebarTab===t?"1px solid #C8A96E":"1px solid transparent",marginBottom:-1,cursor:"pointer"}}>{t}</button>
        ))}
      </div>
      {sidebarTab==="família"?(
        <div style={{flex:1,overflowY:"auto"}}>
          {FAMILY_GROUPS.map(group=>{
            const available=group.items.filter(s=>allRecipes.some(r=>r.categories.includes(s)));
            if(!available.length)return null;
            return(
              <div key={group.label} style={{marginBottom:18}}>
                <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.2)",fontWeight:700,marginBottom:6,paddingLeft:2}}>{group.label}</div>
                {available.map(s=>{
                  const th=TYPE_THEME[s]||TYPE_THEME["_default"];
                  const count=allRecipes.filter(r=>r.categories.includes(s)).length;
                  const active=activeStyle===s;
                  return(
                    <button key={s} onClick={()=>setActiveStyle(active?null:s)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",borderRadius:5,marginBottom:2,textAlign:"left",background:active?th.bg:"transparent",border:`1px solid ${active?th.border+"77":"transparent"}`,cursor:"pointer",transition:"all .14s"}}>
                      <div style={{width:8,height:8,borderRadius:2,background:th.accent,opacity:active?1:.3,flexShrink:0}}/>
                      <span style={{flex:1,fontSize:13,color:active?th.label:"rgba(240,235,225,0.45)",fontWeight:active?600:400}}>{s}</span>
                      <span style={{fontSize:10,color:"rgba(240,235,225,0.18)"}}>{count}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.2)",fontWeight:700,marginBottom:6,paddingLeft:2}}>Técnica</div>
            {TECHNIQUES.filter(s=>allRecipes.some(r=>r.categories.includes(s))).map(s=>{
              const th=TYPE_THEME[s]||TYPE_THEME["_default"];
              const count=allRecipes.filter(r=>r.categories.includes(s)).length;
              const active=activeStyle===s;
              return(
                <button key={s} onClick={()=>setActiveStyle(active?null:s)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",borderRadius:5,marginBottom:2,textAlign:"left",background:active?th.bg:"transparent",border:`1px solid ${active?th.border+"77":"transparent"}`,cursor:"pointer",transition:"all .14s"}}>
                  <div style={{width:8,height:8,borderRadius:2,background:th.accent,opacity:active?1:.3,flexShrink:0}}/>
                  <span style={{flex:1,fontSize:13,color:active?th.label:"rgba(240,235,225,0.45)",fontWeight:active?600:400}}>{s}</span>
                  <span style={{fontSize:10,color:"rgba(240,235,225,0.18)"}}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.2)",fontWeight:700,marginBottom:7}}>Tenho em casa</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:9,maxHeight:95,overflowY:"auto"}}>
            {allSpirits.map(s=>(
              <button key={s} onClick={()=>toggleOwned(s)} style={{padding:"3px 8px",borderRadius:20,fontSize:10,background:owned.includes(s)?"rgba(200,169,110,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${owned.includes(s)?"rgba(200,169,110,0.44)":"rgba(240,235,225,0.08)"}`,color:owned.includes(s)?"#C8A96E":"rgba(240,235,225,0.28)",cursor:"pointer",transition:"all .12s"}}>{s}</button>
            ))}
          </div>
          {owned.length>0&&<button onClick={()=>setFilterMode(filterMode==="tenho"?"tudo":"tenho")} style={{padding:"7px 0",borderRadius:4,marginBottom:12,background:filterMode==="tenho"?"rgba(200,169,110,0.12)":"rgba(240,235,225,0.04)",border:`1px solid ${filterMode==="tenho"?"rgba(200,169,110,0.44)":"rgba(240,235,225,0.08)"}`,color:filterMode==="tenho"?"#C8A96E":"rgba(240,235,225,0.32)",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontWeight:700,cursor:"pointer"}}>{filterMode==="tenho"?"✓ ":""}ver o que posso fazer</button>}
          <div style={{borderTop:"1px solid rgba(240,235,225,0.06)",paddingTop:11,marginBottom:7}}>
            <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.2)",fontWeight:700,marginBottom:6}}>Filtrar por spirit</div>
            <input value={spiritSearch} onChange={e=>setSpiritSearch(e.target.value)} placeholder="buscar…" style={{width:"100%",background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:4,padding:"7px 10px",color:"#F0EBE1",fontSize:12,marginBottom:7,outline:"none"}}/>
          </div>
          {activeSpirits.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:7}}>{activeSpirits.map(s=><button key={s} onClick={()=>toggleSpirit(s)} style={{padding:"3px 8px",borderRadius:20,fontSize:10,background:"rgba(200,169,110,0.12)",border:"1px solid rgba(200,169,110,0.4)",color:"#C8A96E",cursor:"pointer"}}>{s} ×</button>)}</div>}
          <div style={{flex:1,overflowY:"auto"}}>
            {visibleSpirits.map(s=>{
              const count=allRecipes.filter(r=>r.categories.includes(s)).length;
              const active=activeSpirits.includes(s);
              return(<button key={s} onClick={()=>toggleSpirit(s)} style={{display:"flex",justifyContent:"space-between",width:"100%",padding:"7px 10px",borderRadius:4,marginBottom:2,background:active?"rgba(200,169,110,0.07)":"transparent",border:`1px solid ${active?"rgba(200,169,110,0.28)":"transparent"}`,color:active?"#C8A96E":"rgba(240,235,225,0.4)",fontSize:12,cursor:"pointer",textAlign:"left",transition:"all .1s"}}><span>{s}</span><span style={{fontSize:10,opacity:.35}}>{count}</span></button>);
            })}
          </div>
          <div style={{borderTop:"1px solid rgba(240,235,225,0.06)",paddingTop:10,marginTop:8,flexShrink:0}}>
            <div style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.2)",fontWeight:700,marginBottom:6}}>Adicionar bebida</div>
            <div style={{display:"flex",gap:5}}>
              <input value={newSpirit} onChange={e=>setNewSpirit(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newSpirit.trim()){setCustomSpirits(p=>[...new Set([...p,newSpirit.trim()])]);setNewSpirit("");}}} placeholder="ex: Fernet…" style={{flex:1,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:4,padding:"6px 9px",color:"#F0EBE1",fontSize:12,outline:"none"}}/>
              <button onClick={()=>{if(newSpirit.trim()){setCustomSpirits(p=>[...new Set([...p,newSpirit.trim()])]);setNewSpirit("");}}} style={{padding:"6px 10px",borderRadius:4,background:"rgba(200,169,110,0.1)",border:"1px solid rgba(200,169,110,0.3)",color:"#C8A96E",fontSize:13,cursor:"pointer"}}>+</button>
            </div>
            {customSpirits.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:7}}>{customSpirits.map(s=><button key={s} onClick={()=>setCustomSpirits(p=>p.filter(x=>x!==s))} title="Remover" style={{padding:"2px 7px",borderRadius:20,fontSize:10,background:"rgba(200,169,110,0.08)",border:"1px solid rgba(200,169,110,0.2)",color:"rgba(200,169,110,0.6)",cursor:"pointer"}}>{s} ×</button>)}</div>}
          </div>
        </div>
      )}
      {hasFilters&&<button onClick={clearAll} style={{marginTop:12,padding:"7px 0",background:"none",flexShrink:0,border:"1px solid rgba(240,235,225,0.07)",borderRadius:4,color:"rgba(240,235,225,0.25)",fontSize:9,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,cursor:"pointer"}}>limpar filtros</button>}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function Barbook(){
  const [customRecipes, setCustomRecipes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("barbook_custom")||"[]"); } catch { return []; }
  });
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("barbook_favs")||"[]"); } catch { return []; }
  });
  const [owned, setOwned] = useState(() => {
    try { return JSON.parse(localStorage.getItem("barbook_owned")||"[]"); } catch { return []; }
  });
  const [tried, setTried] = useState(() => {
    try { return JSON.parse(localStorage.getItem("barbook_tried")||"[]"); } catch { return []; }
  });
  const [customSpirits, setCustomSpirits] = useState(() => {
    try { return JSON.parse(localStorage.getItem("barbook_spirits")||"[]"); } catch { return []; }
  });
  const [overrides, setOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("barbook_overrides")||"{}"); } catch { return {}; }
  });
  useEffect(()=>{ try{localStorage.setItem("barbook_custom",JSON.stringify(customRecipes));}catch{} },[customRecipes]);
  useEffect(()=>{ try{localStorage.setItem("barbook_favs",JSON.stringify(favs));}catch{} },[favs]);
  useEffect(()=>{ try{localStorage.setItem("barbook_owned",JSON.stringify(owned));}catch{} },[owned]);
  useEffect(()=>{ try{localStorage.setItem("barbook_tried",JSON.stringify(tried));}catch{} },[tried]);
  useEffect(()=>{ try{localStorage.setItem("barbook_spirits",JSON.stringify(customSpirits));}catch{} },[customSpirits]);
  useEffect(()=>{ try{localStorage.setItem("barbook_overrides",JSON.stringify(overrides));}catch{} },[overrides]);

  const allRecipes = useMemo(()=>[
    ...BASE_RECIPES.map(r=>overrides[r.name] ? {...r,...overrides[r.name]} : r),
    ...customRecipes
  ],[customRecipes,overrides]);

  const [activeStyle,setActiveStyle]=useState(null);
  const [activeSpirits,setActiveSpirits]=useState([]);
  const [search,setSearch]=useState("");
  const [spiritSearch,setSpiritSearch]=useState("");
  const [open,setOpen]=useState(null);
  const [editing,setEditing]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [sort,setSort]=useState("nome");
  const [filterMode,setFilterMode]=useState("tudo");
  const [sidebarTab,setSidebarTab]=useState("família");
  const [mobileOpen,setMobileOpen]=useState(false);
  const importRef = useRef();

  const allSpirits = useMemo(()=>[...new Set([...allRecipes.flatMap(r=>r.categories.filter(c=>SPIRIT_CATS.has(c))),...customSpirits])].sort(),[allRecipes,customSpirits]);
  const visibleSpirits = useMemo(()=>allSpirits.filter(s=>s.toLowerCase().includes(spiritSearch.toLowerCase())),[allSpirits,spiritSearch]);

  const toggleFav=n=>setFavs(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);
  const toggleOwned=s=>setOwned(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const toggleTried=n=>setTried(p=>p.includes(n)?p.filter(x=>x!==n):[...p,n]);
  const toggleSpirit=s=>setActiveSpirits(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const clearAll=()=>{setActiveStyle(null);setActiveSpirits([]);setSearch("");setFilterMode("tudo");};
  const hasFilters=activeStyle||activeSpirits.length>0||search||filterMode!=="tudo";

  const hasAllIngredients = useCallback(recipe => {
    const spirits = recipe.categories.filter(c=>SPIRIT_CATS.has(c)||customSpirits.includes(c));
    return spirits.length>0 && spirits.every(s=>owned.includes(s));
  },[owned,customSpirits]);

  const surpriseMe = useCallback(()=>{
    const pool = allRecipes.filter(r=>!tried.includes(r.name));
    if(!pool.length) return;
    setOpen(pool[Math.floor(Math.random()*pool.length)]);
  },[allRecipes,tried]);

  const saveRecipe = useCallback(recipe => {
    setCustomRecipes(p => {
      const idx = p.findIndex(r=>r.id===recipe.id);
      if (idx>=0) { const n=[...p]; n[idx]=recipe; return n; }
      return [...p, recipe];
    });
    setShowForm(false); setEditing(null);
  }, []);

  const deleteRecipe = useCallback(recipe => {
    setCustomRecipes(p=>p.filter(r=>r.id!==recipe.id));
    setOpen(null);
  }, []);

  const rateRecipe = useCallback((recipe, rating) => {
    if (recipe.custom) {
      setCustomRecipes(p=>p.map(r=>r.name===recipe.name ? {...r, rating} : r));
    } else {
      setOverrides(p=>({...p, [recipe.name]:{...(p[recipe.name]||{}), rating}}));
    }
    setOpen(prev=>prev ? {...prev, rating} : prev);
  }, []);

  const exportJSON = () => {
    const data = JSON.stringify({ custom: customRecipes, favs, owned }, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data],{type:"application/json"}));
    a.download = `barbook_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const importJSON = e => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!window.confirm("Importar vai sobrescrever suas receitas, favoritos e ingredientes salvos. Continuar?")) { e.target.value=""; return; }
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.custom) setCustomRecipes(d.custom);
        if (d.favs) setFavs(d.favs);
        if (d.owned) setOwned(d.owned);
      } catch { alert("Arquivo inválido."); }
    };
    r.readAsText(file);
    e.target.value="";
  };

  const filtered = useMemo(()=>{
    let list = allRecipes.filter(r=>{
      if(filterMode==="favs"&&!favs.includes(r.name))return false;
      if(filterMode==="tenho"&&!hasAllIngredients(r))return false;
      if(filterMode==="custom"&&!r.custom)return false;
      if(filterMode==="naoprovei"&&tried.includes(r.name))return false;
      if(activeStyle&&!r.categories.includes(activeStyle))return false;
      if(activeSpirits.length>0&&!activeSpirits.every(s=>r.categories.includes(s)))return false;
      if(search){const q=search.toLowerCase();return r.name.toLowerCase().includes(q)||r.ingredients.some(i=>i.toLowerCase().includes(q))||r.categories.some(c=>c.toLowerCase().includes(q));}
      return true;
    });
    if(sort==="rating")list=[...list].sort((a,b)=>b.rating-a.rating);
    else if(sort==="ingredientes")list=[...list].sort((a,b)=>a.ingredients.length-b.ingredients.length);
    else list=[...list].sort((a,b)=>a.name.localeCompare(b.name,"pt"));
    return list;
  },[allRecipes,activeStyle,activeSpirits,search,favs,owned,tried,sort,filterMode,hasAllIngredients]);

  const triedCount = tried.length;
  const sidebarProps = {sidebarTab,setSidebarTab,allRecipes,activeStyle,setActiveStyle,allSpirits,visibleSpirits,owned,toggleOwned,filterMode,setFilterMode,activeSpirits,toggleSpirit,spiritSearch,setSpiritSearch,hasFilters,clearAll,customSpirits,setCustomSpirits};

  return(
    <div style={{fontFamily:"Archivo,sans-serif",minHeight:"100vh",background:"#080808",color:"#F0EBE1"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Archivo:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(240,235,225,0.1);border-radius:2px}
        input,button,textarea{font-family:Archivo,sans-serif;outline:none;cursor:pointer}
        textarea{cursor:text}
        @media(max-width:700px){.dsb{display:none!important}.mbt{display:flex!important}.lay{grid-template-columns:1fr!important}}
      `}</style>
      <input ref={importRef} type="file" accept=".json" onChange={importJSON} style={{display:"none"}}/>

      {/* HEADER */}
      <header style={{padding:"15px 22px 13px",borderBottom:"1px solid rgba(240,235,225,0.06)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <button className="mbt" onClick={()=>setMobileOpen(true)} style={{display:"none",background:"none",border:"1px solid rgba(240,235,225,0.1)",borderRadius:5,padding:"6px 10px",color:"rgba(240,235,225,0.45)",fontSize:14}}>☰</button>
        <div style={{display:"flex",alignItems:"baseline",gap:10,marginRight:"auto"}}>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:600,letterSpacing:-.5}}>Bar<em style={{color:"#C8A96E"}}>book</em></span>
          <div style={{display:"flex",flexDirection:"column",gap:1}}>
            <span style={{fontSize:9,letterSpacing:3,textTransform:"uppercase",color:"rgba(240,235,225,0.18)",fontWeight:700}}>{allRecipes.length} receitas</span>
            <span style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"#4ADE80",fontWeight:700,opacity:.8}}>{triedCount} provados</span>
          </div>
        </div>

        {/* filtros rápidos */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[
            ["tudo","Todos"],
            ["favs",`♥${favs.length?` ${favs.length}`:""}`],
            ["naoprovei","Não provei"],
            ["tenho","O que tenho"],
          ].map(([v,l])=>(
            <button key={v} onClick={()=>setFilterMode(v)} style={{padding:"5px 11px",borderRadius:20,fontSize:10,background:filterMode===v?"rgba(200,169,110,0.13)":"rgba(240,235,225,0.04)",border:`1px solid ${filterMode===v?"rgba(200,169,110,0.45)":"rgba(240,235,225,0.08)"}`,color:filterMode===v?"#C8A96E":"rgba(240,235,225,0.32)",transition:"all .15s"}}>{l}</button>
          ))}
        </div>

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="buscar drink, ingrediente ou técnica…" style={{background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",borderRadius:5,padding:"7px 12px",color:"#F0EBE1",fontSize:12,width:230}} onFocus={e=>e.target.style.borderColor="rgba(200,169,110,0.35)"} onBlur={e=>e.target.style.borderColor="rgba(240,235,225,0.08)"}/>

        {/* ações */}
        <div style={{display:"flex",gap:6}}>
          <button onClick={surpriseMe} title="Sorteia um drink que você ainda não provou" style={{padding:"7px 12px",borderRadius:5,background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.35)",color:"#A78BFA",fontSize:12,fontWeight:600,letterSpacing:.3}}>✦ Surpreenda-me</button>
          <button onClick={()=>setShowForm(true)} style={{padding:"7px 14px",borderRadius:5,background:"rgba(200,169,110,0.15)",border:"1px solid rgba(200,169,110,0.45)",color:"#C8A96E",fontSize:12,fontWeight:600,letterSpacing:.3}}>+ Receita</button>
          <button onClick={exportJSON} title="Exportar backup" style={{padding:"7px 10px",borderRadius:5,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",color:"rgba(240,235,225,0.35)",fontSize:12}}>↓</button>
          <button onClick={()=>importRef.current?.click()} title="Importar backup" style={{padding:"7px 10px",borderRadius:5,background:"rgba(240,235,225,0.04)",border:"1px solid rgba(240,235,225,0.08)",color:"rgba(240,235,225,0.35)",fontSize:12}}>↑</button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileOpen&&(
        <div onClick={()=>setMobileOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:500,backdropFilter:"blur(4px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:0,top:0,bottom:0,width:268,background:"#0C0C0C",borderRight:"1px solid rgba(240,235,225,0.07)",padding:"15px 15px 20px",display:"flex",flexDirection:"column"}}>
            <button onClick={()=>setMobileOpen(false)} style={{background:"none",border:"none",color:"rgba(240,235,225,0.35)",fontSize:18,textAlign:"right",marginBottom:13}}>×</button>
            <SidebarContent {...sidebarProps}/>
          </div>
        </div>
      )}

      <div className="lay" style={{display:"grid",gridTemplateColumns:"244px 1fr",minHeight:"calc(100vh - 68px)"}}>
        <aside className="dsb" style={{borderRight:"1px solid rgba(240,235,225,0.06)",padding:"19px 15px",position:"sticky",top:0,height:"calc(100vh - 68px)",overflowY:"auto"}}>
          <SidebarContent {...sidebarProps}/>
        </aside>

        <main style={{padding:"18px 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <span style={{fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"rgba(240,235,225,0.18)",fontWeight:700}}>
              <span style={{color:"#C8A96E"}}>{filtered.length}</span> drink{filtered.length!==1?"s":""}
              {activeStyle&&` · ${activeStyle}`}
            </span>
            <div style={{display:"flex",gap:5}}>
              {[["nome","A–Z"],["rating","★ Rating"],["ingredientes","# Ing"]].map(([v,l])=>(
                <button key={v} onClick={()=>setSort(v)} style={{padding:"4px 10px",borderRadius:4,fontSize:10,background:sort===v?"rgba(200,169,110,0.1)":"transparent",border:`1px solid ${sort===v?"rgba(200,169,110,0.35)":"rgba(240,235,225,0.07)"}`,color:sort===v?"#C8A96E":"rgba(240,235,225,0.28)",transition:"all .12s"}}>{l}</button>
              ))}
            </div>
          </div>

          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"80px 0",color:"rgba(240,235,225,0.13)"}}>
              <div style={{fontSize:50,marginBottom:16}}>🍹</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontStyle:"italic",marginBottom:8}}>Nenhum drink encontrado</div>
              <div style={{fontSize:10,letterSpacing:2}}>Tente outros filtros ou adicione uma nova receita</div>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:9}}>
              {filtered.map(r=><DrinkCard key={r.id??r.name} recipe={r} isFav={favs.includes(r.name)} onFav={()=>toggleFav(r.name)} isTried={tried.includes(r.name)} onTried={()=>toggleTried(r.name)} hasAll={hasAllIngredients(r)} onClick={()=>setOpen(r)}/>)}
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {open&&<Modal recipe={open} onClose={()=>setOpen(null)} isFav={favs.includes(open.name)} onFav={()=>toggleFav(open.name)} isTried={tried.includes(open.name)} onTried={()=>toggleTried(open.name)} onRating={r=>rateRecipe(open,r)} onEdit={()=>{setEditing(open);setOpen(null);}} onDelete={()=>deleteRecipe(open)}/>}
      {(showForm||editing)&&<RecipeForm initial={editing} onSave={saveRecipe} onClose={()=>{setShowForm(false);setEditing(null);}}/>}
    </div>
  );
}
