import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

print("Importing fastapi...")
from fastapi import FastAPI
print("Importing CORSMiddleware...")
from fastapi.middleware.cors import CORSMiddleware
print("Importing config...")
from config import get_settings
print("Importing coaching router...")
from routers import coaching
print("Importing voice router...")
from routers import voice
print("Importing packs router...")
from routers import packs
print("Importing preprocessing router...")
from routers import preprocessing
print("Importing reference router...")
from routers import reference
print("Importing nlp router...")
from routers import nlp
print("Importing feedback router...")
from routers import feedback
print("All imports done!")
