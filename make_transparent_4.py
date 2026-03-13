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
    
    # Process small coin
    small_coins = glob.glob(f"{brain_dir}/coin_wizz_small_*.png")
    if small_coins:
        make_transparent_green(small_coins[-1], f"{public_dir}/coin_small.png")
        
    # Process medium coin
    mid_coins = glob.glob(f"{brain_dir}/coin_wizz_medium_*.png")
    if mid_coins:
        make_transparent_green(mid_coins[-1], f"{public_dir}/coin_medium.png")
        
    # Process large coin
    large_coins = glob.glob(f"{brain_dir}/coin_wizz_large_*.png")
    if large_coins:
        make_transparent_green(large_coins[-1], f"{public_dir}/coin_large.png")
        
    # Process enemy plane
    enemy_planes = glob.glob(f"{brain_dir}/enemy_plane_*.png")
    if enemy_planes:
        make_transparent_green(enemy_planes[-1], f"{public_dir}/enemy_plane.png")
