export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.marceloparducci.ontherocks',
      sha256_cert_fingerprints: [
        '62:0E:00:3A:60:54:28:39:54:C9:E0:A3:E3:D7:83:1D:60:61:54:D8:FA:6A:39:FE:77:CD:A1:E8:D5:FA:F2:47',
        '64:F9:93:E8:DF:77:8D:7B:CF:71:C6:B9:2F:F3:8A:96:DD:60:30:88:C9:E3:EA:D0:7F:0B:7C:47:E8:95:A2:2C'
      ]
    }
  }]);
}
