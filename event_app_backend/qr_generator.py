import qrcode

def generate_qr(text, file_name):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )

    qr.add_data(text)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    output_path = f"{file_name}.png"
    img.save(output_path)

    print(f"QR Code generated successfully: {output_path}")

if __name__ == "__main__":
    user_text = 'eyJub25jZSI6ICIxVXJsYjBERWNlRy9zb2xvWnorWmpBPT0iLCAiY2lwaGVyIjogIlZkMDFSL3lyNU1yYklFaEl4bldSUkYyNzFGQzB5b05wLytFN1o0VklyQnhlNG96aUw5M0lIRGJKZ3ZJTU9ub0c2TXlmR2U5Wm9TSlRwNDRaQS9MSE5WbFViRnNZIiwgInRhZyI6ICI4dWVQdGVtdW9uZEcveDl0R0ZRb2dBPT0ifQ=='
    qr_name = 'Rings 100 Completed QR'

    generate_qr(user_text, qr_name)
