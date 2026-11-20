/** Chú giải cho hình: nói rõ các chấm, viền và màu nền nghĩa là gì. */
export function Legend({ kind, overlay }: { kind: 'tree' | 'graph'; overlay: boolean }) {
  return (
    <div className="legend-bar" aria-label="Chú giải">
      {kind === 'tree' ? (
        <>
          <span className="lg"><i className="dot subject" />Chấm tròn xanh dương: nút thuộc vùng <b>chủ thể</b> (người dùng)</span>
          <span className="lg"><i className="dot object" />Ô vuông cam: nút thuộc vùng <b>đối tượng</b> (tệp, dữ liệu)</span>
          <span className="lg"><i className="bar" />Thanh màu trên đầu nút: màu của tầng (đậm là tầng nông, nhạt là tầng sâu)</span>
        </>
      ) : (
        <>
          <span className="lg"><i className="shape user" />Người dùng</span>
          <span className="lg"><i className="shape group" />Nhóm</span>
          <span className="lg"><i className="shape org" />Đơn vị</span>
          <span className="lg"><i className="shape file" />Tệp</span>
          <span className="lg"><i className="edge" />Cạnh thường: tạo nên thuộc tính của nút</span>
          <span className="lg"><i className="edge ok" />Cạnh <code>can read</code>: luật cho phép</span>
          <span className="lg"><i className="edge no" />Cạnh <code>cannot read</code>: luật cấm</span>
        </>
      )}
      {overlay && (
        <>
          <span className="lg"><i className="ring subject" />Viền xanh dương: nút chủ thể của luật hoặc của đường đi</span>
          <span className="lg"><i className="ring object" />Viền cam: nút đối tượng</span>
          <span className="lg"><i className="fill ok" />Nền lục: luật cho phép</span>
          <span className="lg"><i className="fill no" />Nền đỏ: luật cấm</span>
          {kind === 'tree' && <span className="lg"><i className="fill ok soft" />Nền nhạt: nút con kế thừa quyền</span>}
          <span className="lg"><i className="ring sel" />Viền đen hoặc vàng: nút đang chọn</span>
        </>
      )}
    </div>
  )
}
