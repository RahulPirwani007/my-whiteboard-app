import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { saveAs } from "file-saver";
import { ChromePicker } from "react-color";
import { AnimatePresence, motion } from "framer-motion";
interface LocationState {
  username?: string;
  email?: string;
}

const WhiteBoard: React.FC = () => {
  const location = useLocation();
  const { username = "", email = "" } = (location.state || {}) as LocationState;
  const profilelogo = username.charAt(0).toUpperCase();

  const [activeTab, setActiveTab] = useState<"file" | "draw">("draw");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [tool, setTool] = useState<string>("pencil");
  const [color, setColor] = useState<string>("#000000");
  const [brushSize, setBrushSize] = useState<number>(4);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const isDrawing = useRef<boolean>(false);
  const history = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [mouseDownPosition, setMouseDownPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [dragging, setDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const tabs = ["file", "draw"] as const;

  useEffect(() => {
    if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      contextRef.current = ctx;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      saveCanvasState();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !(e.target instanceof HTMLElement) ||
        e.target.closest(".chrome-picker") ||
        e.target.closest(".color-preview")
      )
        return;
      setShowPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY, clientX, clientY } = e.nativeEvent;
    if (tool === "grab") {
      setDragging(true);
      dragStart.current = { x: clientX, y: clientY };
      return;
    }

    isDrawing.current = true;
    setMouseDownPosition({ x: offsetX, y: offsetY });

    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineWidth = tool === "pencil" ? 1 : brushSize;
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY, clientX, clientY } = e.nativeEvent;
    const ctx = contextRef.current;
    if (!ctx) return;

    if (tool === "grab" && dragging && dragStart.current) {
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStart.current = { x: clientX, y: clientY };
      return;
    }

    if (!isDrawing.current) return;
    if (["pencil", "brush", "eraser"].includes(tool)) {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === "grab") {
      setDragging(false);
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = contextRef.current;
    if (!ctx) return;

    if (
      ["circle", "rectangle", "polygon"].includes(tool) &&
      mouseDownPosition
    ) {
      const { x: startX, y: startY } = mouseDownPosition;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;

      if (tool === "circle") {
        const radius = Math.hypot(offsetX - startX, offsetY - startY) / 2;
        const centerX = (startX + offsetX) / 2;
        const centerY = (startY + offsetY) / 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      } else if (tool === "rectangle") {
        ctx.rect(startX, startY, offsetX - startX, offsetY - startY);
      } else if (tool === "polygon") {
        const sides = 5;
        const radius = Math.hypot(offsetX - startX, offsetY - startY);
        const angle = (2 * Math.PI) / sides;
        ctx.moveTo(
          startX + radius * Math.cos(0),
          startY + radius * Math.sin(0)
        );
        for (let i = 1; i <= sides; i++) {
          ctx.lineTo(
            startX + radius * Math.cos(i * angle),
            startY + radius * Math.sin(i * angle)
          );
        }
      }

      ctx.stroke();
    }

    if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        ctx.fillStyle = color;
        ctx.font = `${brushSize * 4}px Arial`;
        ctx.fillText(text, offsetX, offsetY);
      }
    }

    if (tool === "fill") {
      const imageData = ctx.getImageData(
        0,
        0,
        canvasRef.current!.width,
        canvasRef.current!.height
      );
      floodFill(imageData, offsetX, offsetY, hexToRgba(color));
      ctx.putImageData(imageData, 0, 0);
    }

    ctx.closePath();
    ctx.globalAlpha = 1.0;
    saveCanvasState();
    setMouseDownPosition(null);
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    history.current.push(dataUrl);
    redoStack.current = [];
  };

  const redrawCanvas = () => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const last = history.current[history.current.length - 1];
    if (!last) return;
    const img = new Image();
    img.src = last;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleUndo = () => {
    if (history.current.length <= 1) return;
    redoStack.current.push(history.current.pop()!);
    redrawCanvas();
  };

  const handleRedo = () => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop()!;
    history.current.push(next);
    const img = new Image();
    img.src = next;
    img.onload = () => {
      contextRef.current?.drawImage(img, 0, 0);
    };
  };

  const handleSaveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, "drawing.png");
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const tools = [
    { name: "pencil", icon: "bx bx-pencil" },
    { name: "brush", icon: "bx bxs-brush" },
    { name: "eraser", icon: "bx bx-eraser" },
    { name: "text", icon: "bx bx-font" },
    { name: "circle", icon: "bx bx-circle" },
    { name: "rectangle", icon: "bx bx-square" },
    { name: "polygon", icon: "bx bx-shape-polygon" },
    { name: "grab", icon: "bx bx-move" },
    { name: "fill", icon: "ri-paint-fill" },
  ];

  const getCursor = (tool: string): string => {
    switch (tool) {
      case "brush":
        return 'url("/cursors/brush.png") 0 31, auto';
      case "pencil":
        return 'url("/cursors/pencil.png") 0 31, auto';
      case "eraser":
        return 'url("/cursors/eraser.png") 0 31, auto';
      case "fill":
        return 'url("/cursors/bucket.png") 16 16, auto';
      default:
        return "crosshair";
    }
  };

  function hexToRgba(hex: string): [number, number, number, number] {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, 255];
  }

  function floodFill(
    imageData: ImageData,
    x: number,
    y: number,
    fillColor: [number, number, number, number]
  ) {
    const { data, width, height } = imageData;

    const getPixel = (
      x: number,
      y: number
    ): [number, number, number, number] => {
      const i = (y * width + x) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };

    const setPixel = (
      x: number,
      y: number,
      color: [number, number, number, number]
    ) => {
      const i = (y * width + x) * 4;
      for (let j = 0; j < 4; j++) data[i + j] = color[j];
    };

    const targetColor = getPixel(x, y);
    if (targetColor.join() === fillColor.join()) return;

    const stack: [number, number][] = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      const currentColor = getPixel(cx, cy);
      if (currentColor.join() !== targetColor.join()) continue;

      setPixel(cx, cy, fillColor);

      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < width - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < height - 1) stack.push([cx, cy + 1]);
    }
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="h-[10vh] flex justify-between items-center px-4 bg-white shadow-md z-10">
        <img src="/logo.png" alt="logo" className="w-16 h-16" />
        <div className="flex justify-center mb-4 relative">
          <div className="flex bg-gray-200 p-1 rounded-full relative">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative px-6 py-2 rounded-full font-medium z-10 overflow-hidden"
                >
                  <span className={isActive ? "text-white" : "text-gray-700"}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </span>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        key="indicator"
                        initial={{ x: -40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 40, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                        className="absolute inset-0 bg-[#670D2F] rounded-full z-[-1]"
                      />
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-5 items-center">
          <p className="w-10 h-10 bg-purple-400 text-white rounded-full flex items-center justify-center text-lg font-semibold">
            {profilelogo}
          </p>
          <div className="flex flex-col mr-3">
            <p className="capitalize">{username}</p>
            <p className="text-sm text-gray-600">{email}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-[10vh] flex items-center px-6 gap-4 relative bg-gray-100 shadow">
        {activeTab === "draw" ? (
          <>
            {tools.map((t) => (
              <i
                key={t.name}
                className={`${
                  t.icon
                } text-2xl cursor-pointer px-2 py-1 rounded ${
                  tool === t.name ? "bg-white text-black" : ""
                }`}
                title={t.name}
                onClick={() => setTool(t.name)}
              />
            ))}
            <i
              className="bx bx-zoom-in text-2xl cursor-pointer px-2 py-1"
              onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
            />
            <i
              className="bx bx-zoom-out text-2xl cursor-pointer px-2 py-1"
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
            />
            <i
              className="bx bx-undo text-2xl cursor-pointer px-2 py-1"
              onClick={handleUndo}
            />
            <i
              className="bx bx-redo text-2xl cursor-pointer px-2 py-1"
              onClick={handleRedo}
            />
            <i
              className="bx bx-download text-2xl cursor-pointer px-2 py-1"
              onClick={handleSaveCanvas}
            />
            <input
              type="range"
              min="1"
              max="30"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
            <div className="relative">
              <div
                className="w-6 h-6 rounded-full border-2 border-gray-300 cursor-pointer color-preview"
                style={{ backgroundColor: color }}
                onClick={() => setShowPicker(!showPicker)}
                title="Pick Color"
              />
              {showPicker && (
                <div className="absolute top-8 left-0 z-50">
                  <ChromePicker
                    color={color}
                    onChange={(updated) => setColor(updated.hex)}
                    disableAlpha
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <label className="cursor-pointer flex flex-col items-center">
              <i className="bx bx-upload text-2xl" title="Upload Files"></i>
              <input type="file" multiple hidden onChange={handleFileUpload} />
            </label>
            <button
              onClick={() => {
                uploadedFiles.forEach((file) => {
                  saveAs(file, file.name);
                });
              }}
              className="bg-[#670D2F] text-white px-4 py-2 rounded shadow hover:bg-[#A53860]"
            >
              Save All
            </button>
          </>
        )}
      </div>

      {/* Main Area */}
      <div className="relative h-full bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          onMouseDown={activeTab === "draw" ? startDrawing : undefined}
          onMouseMove={activeTab === "draw" ? draw : undefined}
          onMouseUp={activeTab === "draw" ? stopDrawing : undefined}
          onMouseLeave={activeTab === "draw" ? stopDrawing : undefined}
          style={{
            cursor: getCursor(tool),
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${
              offset.y / zoom
            }px)`,
            transformOrigin: "top left",
            pointerEvents: activeTab === "draw" ? "auto" : "none",
            zIndex: 0,
          }}
        />
        {activeTab === "file" && (
          <div className="absolute top-0 left-0 w-full max-h-[80vh] p-4 overflow-y-auto bg-white bg-opacity-90 z-10 mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {uploadedFiles.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">
                No files uploaded.
              </p>
            ) : (
              uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="mb-4 p-3 border rounded shadow-sm bg-gray-50 mx-auto"
                >
                  {file.type.startsWith("image/") && (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="mt-2 w-fit h-fit object-contain border mr-2"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhiteBoard;
