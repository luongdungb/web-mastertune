// Car models, fitting notes by body type, and which packages suit which segment.
import carsJson from '../data/cars.json';
import installsJson from '../data/installs.json';
import packagesJson from '../data/packages.json';

export type Car = { slug: string; brand: string; model: string; body: 'sedan' | 'suv' | 'pickup' | 'mpv'; tier: 'pho-thong' | 'cao-cap'; ev?: boolean; lux?: boolean };
/** A real installation done on a car (photos in public/images/installs/). */
export type Install = { car: string; title: string; dealer?: string; date?: string; images: string[]; products: string[]; note?: string };
export type Package = (typeof packagesJson)[number];

export const cars = carsJson as Car[];
export const installs = installsJson as Install[];
export const carBrands = [...new Set(cars.map((c) => c.brand))];

export const BODY_LABEL: Record<Car['body'], string> = { sedan: 'Sedan', suv: 'SUV, crossover', pickup: 'Bán tải', mpv: 'MPV, xe gia đình' };

// General guidance per body type. Exact speaker sizes and mounting are checked on the car by the installer.
const BODY_NOTES: Record<Car['body'], string[]> = {
  sedan: [
    'Loa cánh: phần lớn sedan dùng loa khoảng 16 cm ở cửa trước và sau, thay được bằng bộ loa cánh 2-way mà không cắt khoét.',
    'Treble: đặt ở cột A hoặc góc gương để giọng ca đứng cao, giữa kính lái.',
    'Tiếng trầm: sub điện gầm ghế giữ trọn cốp; sub hơi trong cốp cho tiếng trầm sâu và có lực hơn.',
  ],
  suv: [
    'Khoang xe rộng nên tiếng trầm dễ bị loãng: nên có sub để âm thanh đầy đặn.',
    'Xe có lốp dự phòng đặt trong cốp có thể dùng sub chuyên cho hốc lốp, không mất diện tích cốp.',
    'Hàng ghế sau xa loa trước: DSP giúp cân bằng âm thanh cho cả xe.',
  ],
  pickup: [
    'Cabin nhỏ và không có cốp kín: ưu tiên sub điện mỏng đặt dưới hoặc sau hàng ghế sau.',
    'Xe rung nhiều khi đi đường xấu: dây tín hiệu và dây nguồn cần đi gọn, cố định chắc.',
    'Cửa xe dày, có không gian tốt cho loa cánh 2-way hoặc 3-way.',
  ],
  mpv: [
    'Ba hàng ghế: dùng DSP để chia âm thanh đều cho hàng sau, không chỉ ghế lái.',
    'Sub điện gầm ghế giữ khoang hành lý cho gia đình.',
    'Nên nâng cấp cả loa cửa sau để hàng ghế sau nghe rõ.',
  ],
};
const EV_NOTES = [
  'Xe điện rất êm, tiếng ồn nền thấp nên chi tiết âm thanh nghe rõ hơn xe xăng.',
  'Nguồn 12V của xe điện có giới hạn: nên chọn Amply/DSP hiệu suất cao, công suất vừa đủ.',
];
const LUX_NOTES = [
  'Hệ thống zin thường có nhiều loa và kênh: dùng Amply/DSP nhận tín hiệu loa zin để giữ nguyên màn hình và tính năng của xe.',
];

export function notesFor(car: Car): string[] {
  return [...BODY_NOTES[car.body], ...(car.ev ? EV_NOTES : []), ...(car.lux ? LUX_NOTES : [])];
}

const BY_TIER: Record<Car['tier'], string[]> = {
  'pho-thong': ['nang-cap-loa-zin', 'san-khau-truoc-mat', 'hi-end-3-way'],
  'cao-cap': ['san-khau-truoc-mat', 'hi-end-3-way', 'cau-hinh-thi-dau'],
};
export function packagesFor(car: Car): Package[] {
  return BY_TIER[car.tier].map((s) => packagesJson.find((p) => p.slug === s)!).filter(Boolean);
}

export const installsFor = (car: Car) => installs.filter((i) => i.car === car.slug);
export const carName = (c: Car) => `${c.brand} ${c.model}`;
