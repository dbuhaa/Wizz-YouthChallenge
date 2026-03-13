from PIL import Image
import sys

def make_transparent_green(image_path, out_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        # We know the background is close to #00FF00 (0, 255, 0)
        tolerance_g = 150 # Green channel needs to be high
        tolerance_r_b = 100 # Red and Blue channels need to be low
        
        newData = []
        for item in datas:
            # If it's a strongly green pixel
            if item[1] > tolerance_g and item[0] < tolerance_r_b and item[2] < tolerance_r_b:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(out_path, "PNG")
        print(f"Processed {image_path} -> {out_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

if __name__ == "__main__":
    import os
    import glob
    brain_dir = "/Users/buhadavid/.gemini/antigravity/brain/920a9233-b816-4fa4-9db1-50bfe644d01b"
    public_dir = "/Users/buhadavid/Wizz_Game1/public"
    
    # Process A320neo Fix
    a320_planes = glob.glob(f"{brain_dir}/plane_a320_fix_*.png")
    if a320_planes:
        make_transparent_green(a320_planes[-1], f"{public_dir}/plane.png")
