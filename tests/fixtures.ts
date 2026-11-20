export const DOC = {
  CongTyA: {
    nhanvien: [
      { _id: 'phong_KeToan', nhom_thue: ['An', 'Binh'], nhom_kiemtoan: ['Chi'] },
      { _id: 'phong_NhanSu', nhom_tuyendung: ['Dung'] },
    ],
    tailieu: [
      { _id: 'bophan_TaiChinh', chinhanh_HN: ['baocao_Q3.pdf'], chinhanh_HCM: ['baocao_HCM_Q3.pdf'] },
      { _id: 'bophan_NhanSu', chinhanh_HN: ['luong_T10.xlsx'] },
    ],
  },
}
export const KV = {
  CongTyA: {
    KeToan: { nhom_thue: 'An', nhom_kiemtoan: 'Chi' },
    TaiChinh: { chinhanh_HN: 'baocao_Q3.pdf' },
  },
}
export const WC = {
  CongTyA: {
    nhanvien: { phong_KeToan: { nhom_thue: 'An', nhom_kiemtoan: 'Chi' } },
    tailieu: { bophan_TaiChinh: { chinhanh_HN: 'baocao_Q3.pdf' } },
  },
}
export const GRAPH = {
  nodes: [
    { id: 'An', type: 'user' }, { id: 'Chi', type: 'user' },
    { id: 'NhomThue', type: 'group' }, { id: 'NhomKiemToan', type: 'group' },
    { id: 'PhongKeToan', type: 'org' }, { id: 'CongTyA', type: 'org' },
    { id: 'baocao_Q3.pdf', type: 'file' }, { id: 'BoPhanTaiChinh', type: 'org' },
  ],
  edges: [
    { from: 'An', to: 'NhomThue', label: 'in' },
    { from: 'Chi', to: 'NhomKiemToan', label: 'in' },
    { from: 'NhomThue', to: 'PhongKeToan', label: 'works for' },
    { from: 'PhongKeToan', to: 'CongTyA', label: 'belongs to' },
    { from: 'baocao_Q3.pdf', to: 'BoPhanTaiChinh', label: 'managed by' },
    { from: 'BoPhanTaiChinh', to: 'CongTyA', label: 'belongs to' },
    { from: 'NhomThue', to: 'baocao_Q3.pdf', label: 'can read' },
  ],
}
