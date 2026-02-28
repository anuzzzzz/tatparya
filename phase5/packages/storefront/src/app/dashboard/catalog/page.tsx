'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Camera, Upload, Sparkles, Loader2, CheckCircle2, Package, ArrowRight,
  X, Image as ImageIcon, RotateCcw, Zap, AlertCircle,
} from 'lucide-react';
import { DashboardProviders } from '@/components/dashboard/providers';
import { DashboardGuard } from '@/components/dashboard/guard';
import { Card, CardContent, CardHeader, Button, PageHeader } from '@/components/dashboard/ui';
import { useAuth } from '@/lib/supabase/auth-provider';
import { formatPrice } from '@/lib/utils';

type Step = 'upload' | 'analyzing' | 'result' | 'error';

interface GeneratedProduct {
  productId: string;
  name: string;
  price: number;
  confidence: number;
  suggestion: any;
}

function AICatalog() {
  const { trpc, storeId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [hints, setHints] = useState('');
  const [result, setResult] = useState<GeneratedProduct | null>(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    const selected = files.slice(0, 5);
    setSelectedFiles(selected);

    // Generate preview URLs
    const urls = selected.map((f) => URL.createObjectURL(f));
    // Clean up old previews
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPreviewUrls(urls);
    setError('');
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setHints('');
    setResult(null);
    setError('');
    setStep('upload');
    setUploadProgress('');
  }

  const handleGenerate = useCallback(async () => {
    if (!storeId || selectedFiles.length === 0) return;
    setStep('analyzing');
    setError('');

    try {
      // Step 1: Upload images to get URLs
      setUploadProgress('Uploading images...');
      const imageUrls: string[] = [];

      for (const file of selectedFiles) {
        // Get presigned upload URL
        const uploadResult = await trpc.media.getUploadUrl.mutate({
          storeId,
          filename: file.name,
          contentType: file.type as any,
          fileSizeBytes: file.size,
        });

        const { uploadUrl, publicUrl } = uploadResult as any;

        // Upload to R2 (or dev endpoint)
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        imageUrls.push(publicUrl);
      }

      // Step 2: Call AI catalog generation
      setUploadProgress('Analyzing with AI...');
      const genResult = await trpc.catalog.generateFromImages.mutate({
        storeId,
        imageUrls,
        hints: hints ? { sellerHints: hints } : undefined,
      });

      const gen = genResult as any;
      setResult({
        productId: gen.productId,
        name: gen.name || gen.product?.name || 'Generated Product',
        price: gen.price || gen.product?.price || 0,
        confidence: gen.confidence || 0,
        suggestion: gen.suggestion || gen,
      });
      setStep('result');
    } catch (err: any) {
      console.error('Catalog generation error:', err);
      setError(err.message || 'Failed to generate product listing');
      setStep('error');
    }
  }, [storeId, selectedFiles, hints, trpc]);

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="AI Catalog"
        description="Upload product photos and let AI create your listing instantly"
      />

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Hero Upload Area */}
          <Card>
            <CardContent className="p-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-xl p-8 text-center cursor-pointer transition-colors group"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-50 group-hover:bg-orange-100 rounded-2xl mb-4 transition-colors">
                  <Camera className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Upload Product Photos
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Take a photo with your phone or select from gallery
                </p>
                <p className="text-xs text-gray-400">
                  JPG, PNG, WebP, HEIC · Up to 5 images · Max 20MB each
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Preview selected files */}
              {previewUrls.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    {selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''} selected
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {previewUrls.map((url, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {selectedFiles.length < 5 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 flex items-center justify-center transition-colors"
                      >
                        <Upload className="w-5 h-5 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hints */}
          {previewUrls.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Hints for AI <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={hints}
                  onChange={(e) => setHints(e.target.value)}
                  placeholder="e.g. This is a cotton saree from Varanasi, price around ₹2000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Help the AI with details it can't see — material, brand, price range, etc.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          {previewUrls.length > 0 && (
            <Button onClick={handleGenerate} size="lg" className="w-full">
              <Sparkles className="w-5 h-5" />
              Generate Product Listing
            </Button>
          )}
        </div>
      )}

      {/* Analyzing Step */}
      {step === 'analyzing' && (
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-50 rounded-full mb-6">
            <Sparkles className="w-10 h-10 text-orange-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI is analyzing your photos</h3>
          <p className="text-sm text-gray-500 mb-6">{uploadProgress}</p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
          <div className="mt-6 flex gap-2 justify-center flex-wrap">
            {previewUrls.map((url, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 opacity-60">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Result Step */}
      {step === 'result' && result && (
        <div className="space-y-6">
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900">Product Created as Draft!</h3>
                <p className="text-sm text-green-700 mt-0.5">
                  AI confidence: {Math.round(result.confidence * 100)}%
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900">Generated Listing</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-xs text-gray-500 uppercase">Name</span>
                <p className="text-sm font-medium text-gray-900">{result.name}</p>
              </div>
              {result.suggestion?.description && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">Description</span>
                  <p className="text-sm text-gray-700">{result.suggestion.description}</p>
                </div>
              )}
              <div className="flex gap-6">
                <div>
                  <span className="text-xs text-gray-500 uppercase">Price</span>
                  <p className="text-lg font-bold text-gray-900">{formatPrice(result.price)}</p>
                </div>
                {result.suggestion?.hsnCodeSuggestion && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">HSN</span>
                    <p className="text-sm text-gray-700">{result.suggestion.hsnCodeSuggestion}</p>
                  </div>
                )}
                {result.suggestion?.gstRate != null && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase">GST</span>
                    <p className="text-sm text-gray-700">{result.suggestion.gstRate}%</p>
                  </div>
                )}
              </div>
              {result.suggestion?.tags?.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">Tags</span>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {result.suggestion.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Link href={`/dashboard/products/${result.productId}`} className="flex-1">
              <Button className="w-full">
                <Package className="w-4 h-4" />
                Edit & Publish
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="secondary" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
              Add Another
            </Button>
          </div>
        </div>
      )}

      {/* Error Step */}
      {step === 'error' && (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Generation Failed</h3>
          <p className="text-sm text-red-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setStep('upload'); setError(''); }}>
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
            <Link href="/dashboard/products/new">
              <Button variant="secondary">Create Manually</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* How it works (shown below upload) */}
      {step === 'upload' && previewUrls.length === 0 && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: <Camera className="w-5 h-5" />, title: 'Upload Photos', desc: 'Take product photos with your phone' },
                { icon: <Sparkles className="w-5 h-5" />, title: 'AI Analyzes', desc: 'Claude Vision identifies details, suggests pricing & HSN' },
                { icon: <Zap className="w-5 h-5" />, title: 'Listing Ready', desc: 'Review, edit, and publish in seconds' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-50 rounded-full mb-2">
                    <span className="text-orange-500">{item.icon}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <DashboardProviders>
      <DashboardGuard title="AI Catalog">
        <AICatalog />
      </DashboardGuard>
    </DashboardProviders>
  );
}
